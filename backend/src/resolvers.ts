import { Arg, Authorized, Ctx, FieldResolver, ID, Int, Mutation, Query, Resolver, Root, type ResolverInterface } from 'type-graphql';
import { Roles, Appointment, AppointmentStatus, CalendarSlot, Customer, type Context } from './types';
import { type UUID } from 'crypto';
import { In, LessThanOrEqual, MoreThanOrEqual, type FindOptionsWhere } from 'typeorm';
import { Duration } from 'typed-duration';
import * as EmailValidator from 'email-validator';
import { generateToken } from './token';
import { GraphQLError } from 'graphql';
import { cancelIfNotPaid, deleteAppointment as delAppointment, notifyCustomer } from './actions';

const ONE_DAY = Duration.seconds.from(Duration.days.of(1));
const ONE_MONTH = Duration.seconds.from(Duration.days.of(30));
const TWELVE_HOURS = Duration.seconds.from(Duration.hours.of(12));
const ONE_YEAR = Duration.seconds.from(Duration.days.of(365));

const getCustomerOrThrow = async (context: Context): Promise<Customer> => {
  if (!context.customerId) {
    throw new GraphQLError('No customer id found');
  }
  const customer = await Customer.findOne({ where: { id: context.customerId } });
  if (!customer) {
    throw new GraphQLError('No customer found');
  }

  return customer;
};

@Resolver(of => Customer)
export class CustomerResolver {
  @Query(returns => String)
  async login(@Arg('name', () => String!, { nullable: false }) name: string, @Arg('emailAddress', () => String!, { nullable: false }) emailAddress: string): Promise<string> {
    const customer = await Customer.findOne({ where: { name, emailAddress } }) || undefined;
    if (!customer) {
      throw new GraphQLError('No user found');
    }
    return generateToken(customer.id);
  }

  @Authorized(Roles.CUSTOMER)
  @Query(returns => String)
  async refresh(@Ctx() context: Context): Promise<string> {
    const customer = await getCustomerOrThrow(context);
    return generateToken(customer.id);
  }

  @Mutation(returns => String)
  async signup(@Arg('name', () => String!, { nullable: false }) name: string, @Arg('emailAddress', () => String!, { nullable: false }) emailAddress: string): Promise<string> {
    if (!name || name.length < 2) {
      throw new GraphQLError('Invalid name');
    }

    if (!emailAddress || !EmailValidator.validate(emailAddress)) {
      throw new GraphQLError('Invalid email address');
    }
    
    const customer = await Customer.create({ name, emailAddress }).save();
    return generateToken(customer.id);
  }
};

@Resolver(of => CalendarSlot)
export class CalendarSlotResolver implements ResolverInterface<CalendarSlot> {
  @Query(returns => [CalendarSlot])
  async getCalendarSlots(@Arg('startTime', () => Date, { nullable: true }) startTime?: Date, @Arg('endTime', () => Date, { nullable: true }) endTime?: Date, @Arg('available', () => Boolean, { nullable: true }) available?: boolean): Promise<CalendarSlot[]> {
    const whereClauses: FindOptionsWhere<CalendarSlot> = {};
    if (startTime) {
      const startTimestamp = startTime.getTime() / 1000;
      whereClauses['startTimestamp'] = MoreThanOrEqual(startTimestamp);
    } else {
      const startTimestamp = Date.now() / 1000 - ONE_MONTH;
      whereClauses['startTimestamp'] = MoreThanOrEqual(startTimestamp);
    }
    if (endTime) {
      const endTimestamp = endTime.getTime() / 1000;
      whereClauses['endTimestamp'] = LessThanOrEqual(endTimestamp);
    } else {
      const endTimestamp = Date.now() / 1000 + ONE_MONTH;
      whereClauses['endTimestamp'] = LessThanOrEqual(endTimestamp);
    }

    if (available !== undefined) {
      whereClauses['available'] = available;
    }
    return await CalendarSlot.find({ where: whereClauses, order: { startTimestamp: 'ASC' } });
  }

  @FieldResolver(type => Int)
  durationInMinutes(@Root() calendarSlot: CalendarSlot): number {
    return Duration.minutes.from(Duration.seconds.of(calendarSlot.endTimestamp - calendarSlot.startTimestamp));
  }

  @FieldResolver(type => Date)
  startTime(@Root() calendarSlot: CalendarSlot): Date {
    return new Date(calendarSlot.startTimestamp * 1000);
  }

  @FieldResolver(type => Date)
  endTime(@Root() calendarSlot: CalendarSlot): Date {
    return new Date(calendarSlot.endTimestamp * 1000);
  }

  @Authorized(Roles.ADMIN)
  @Mutation(returns => CalendarSlot)
  async createCalendarSlot(@Arg('startTime', () => Date!) startTime: Date, @Arg('durationInMinutes', () => Int!, { nullable: true, defaultValue: 30 }) durationInMinutes: number): Promise<CalendarSlot> {
    const startTimestamp = startTime.getTime() / 1000;
    const endTimestamp = startTimestamp + Duration.seconds.from(Duration.minutes.of(durationInMinutes));
    
    if (startTimestamp <= Date.now() / 1000 || startTimestamp > Date.now() / 1000 + ONE_YEAR) {
      throw new GraphQLError('Invalid start time');
    }

    if (durationInMinutes <= 0 || durationInMinutes > 60) {
      throw new GraphQLError('Invalid duration in minutes');
    }

    if (await CalendarSlot.findOne({ where: [
        { startTimestamp: LessThanOrEqual(startTimestamp), endTimestamp:  MoreThanOrEqual(startTimestamp) },
        { startTimestamp: LessThanOrEqual(endTimestamp), endTimestamp:  MoreThanOrEqual(endTimestamp) },
      ] })) {
      throw new GraphQLError('Overlaps with other slot');
    }

    return await CalendarSlot.create({ startTimestamp, endTimestamp, available: true }).save();
  }

  @Authorized(Roles.ADMIN)
  @Mutation(returns => Boolean)
  async deleteCalendarSlot(@Arg('calendarSlotId', () => ID!) calendarSlotId: UUID): Promise<Boolean> {
    const calendarSlot = await CalendarSlot.findOne({ where: { id: calendarSlotId } });
    if (!calendarSlot) {
      return false;
    }

    const appointment = await Appointment.findOne({ where: { calendarSlot }, relations: { calendarSlot: true } }) || undefined;
    if (appointment) {
      throw new GraphQLError('Calendar Slot has an appointment, delete appointment first');
    }

    await calendarSlot.remove();
    return true;
  }
};

@Resolver(of => Appointment)
export class AppointmentResolver {
  @Authorized(Roles.CUSTOMER)
  @Query(returns => [Appointment])
  async getCustomerAppointments(@Ctx() context: Context, @Arg('statuses', () => [AppointmentStatus], { nullable: false, defaultValue: Object.values(AppointmentStatus) }) appointmentStatus: AppointmentStatus[], @Arg('startTime', () => Date, { nullable: true }) startTime?: Date, @Arg('endTime', () => Date, { nullable: true }) endTime?: Date): Promise<Appointment[]> {
    const customer = await getCustomerOrThrow(context);
    
    const whereClauses: FindOptionsWhere<Appointment> = {};
    whereClauses['customer'] = customer;

    if (appointmentStatus !== undefined) {
      whereClauses['appointmentStatus'] = In(appointmentStatus);
    }
    let appointments = await Appointment.find({ where: whereClauses, relations: { customer: true, calendarSlot: true } });
    if (startTime) {
      const startTimestamp = startTime.getTime() / 1000;
      appointments = appointments.filter(appointment => appointment.calendarSlot.startTimestamp >= startTimestamp);
    } else {
      const startTimestamp = Date.now() / 1000 - ONE_MONTH;
      appointments = appointments.filter(appointment => appointment.calendarSlot.startTimestamp >= startTimestamp);
    }
    if (endTime) {
      const endTimestamp = endTime.getTime() / 1000;
      appointments = appointments.filter(appointment => appointment.calendarSlot.endTimestamp <= endTimestamp);
    } else {
      const endTimestamp = Date.now() / 1000 + ONE_MONTH;
      appointments = appointments.filter(appointment => appointment.calendarSlot.endTimestamp <= endTimestamp);
    }
    return appointments;
  }

  @Authorized(Roles.ADMIN)
  @Query(returns => [Appointment])
  async getAppointments(@Arg('statuses', () => [AppointmentStatus], { nullable: false, defaultValue: Object.values(AppointmentStatus) }) appointmentStatus: AppointmentStatus[], @Arg('startTime', () => Date, { nullable: true }) startTime?: Date, @Arg('endTime', () => Date, { nullable: true }) endTime?: Date): Promise<Appointment[]> {
    const whereClauses: FindOptionsWhere<Appointment> = {};
    if (appointmentStatus !== undefined) {
      whereClauses['appointmentStatus'] = In(appointmentStatus);
    }
    let appointments = await Appointment.find({ where: whereClauses, relations: { customer: true, calendarSlot: true } });
    if (startTime) {
      const startTimestamp = startTime.getTime() / 1000;
      appointments = appointments.filter(appointment => appointment.calendarSlot.startTimestamp >= startTimestamp);
    } else {
      const startTimestamp = Date.now() / 1000 - ONE_MONTH;
      appointments = appointments.filter(appointment => appointment.calendarSlot.startTimestamp >= startTimestamp);
    }
    if (endTime) {
      const endTimestamp = endTime.getTime() / 1000;
      appointments = appointments.filter(appointment => appointment.calendarSlot.endTimestamp <= endTimestamp);
    } else {
      const endTimestamp = Date.now() / 1000 + ONE_DAY;
      appointments = appointments.filter(appointment => appointment.calendarSlot.endTimestamp <= endTimestamp);
    }
    return appointments;
  }

  @Authorized(Roles.CUSTOMER)
  @Mutation(returns => Appointment)
  async createAppointment(@Ctx() context: Context, @Arg('calendarSlotId', () => ID!) calendarSlotId: UUID): Promise<Appointment> {
    const customer = await getCustomerOrThrow(context);

    const calendarSlot = await CalendarSlot.findOne({ where: { id: calendarSlotId } });
    if (!calendarSlot) {
      throw new GraphQLError('No calendar slot found');
    }

    if (!calendarSlot.available) {
      throw new GraphQLError('Calendar slot not available');
    }

    if (calendarSlot.startTimestamp <= Date.now() / 1000) {
      throw new GraphQLError('Invalid start time (start time in the past)');
    }

    if (calendarSlot.startTimestamp <= Date.now() / 1000 + TWELVE_HOURS) {
      throw new GraphQLError('Invalid start time (less than 12h in the future)');
    }

    if (calendarSlot.startTimestamp > Date.now() / 1000 + ONE_YEAR) {
      throw new GraphQLError('Invalid start time (more than 1 year in the future)');
    }

    const existingAppointment = await Appointment.findOne({ where: { calendarSlot }, relations: { customer: true, calendarSlot: true } });
    if (existingAppointment) {
      calendarSlot.available = false;
      await calendarSlot.save();
      throw new GraphQLError('Calendar slot not available');
    }

    calendarSlot.available = false;
    await calendarSlot.save();
    const appointment = await Appointment.create({ calendarSlot, customer, appointmentStatus: AppointmentStatus.PendingPayment }).save();
    
    setTimeout(() => cancelIfNotPaid(appointment.id), Duration.milliseconds.from(Duration.minutes.of(10)));
    notifyCustomer(appointment.id, calendarSlot, AppointmentStatus.PendingPayment);

    return appointment;
  }

  @Authorized(Roles.CUSTOMER)
  @Mutation(returns => Boolean)
  async cancelAppointment(@Ctx() context: Context, @Arg('appointmentId', () => ID!) appointmentId: UUID): Promise<boolean> {
    const customer = await getCustomerOrThrow(context);
    
    const appointment = await Appointment.findOne({ where: { id: appointmentId }, relations: { customer: true, calendarSlot: true } });
    if (!appointment) {
      throw new GraphQLError('No appointment found');
    }

    if (appointment.calendarSlot.startTimestamp <= Date.now() / 1000) {
      throw new GraphQLError('Appointment can not be cancelled: was in the past');
    }

    if (appointment.calendarSlot.startTimestamp <= Date.now() / 1000 + TWELVE_HOURS) {
      throw new GraphQLError('Appointment can no longer be cancelled (too close, starts in less than 12h)');
    }

    if (appointment.customer.id !== customer.id) {
      throw new GraphQLError('Appointment has different customer');
    }

    const calendarSlot = appointment.calendarSlot;

    calendarSlot.available = true;
    await calendarSlot.save();
    await appointment.remove();

    notifyCustomer(appointmentId, calendarSlot, 'CANCELLED');

    return true;
  }

  @Authorized(Roles.ADMIN)
  @Mutation(returns => Appointment)
  async confirmAppointment(@Arg('appointmentId', () => ID!) appointmentId: UUID): Promise<Appointment> {
    const appointment = await Appointment.findOne({ where: { id: appointmentId }, relations: { customer: true, calendarSlot: true } });
    if (!appointment) {
      throw new GraphQLError('No appointment found');
    }

    if (appointment.appointmentStatus !== AppointmentStatus.Reserved) {
      throw new GraphQLError('Appointment not ready for confirmation');
    }

    appointment.appointmentStatus = AppointmentStatus.Confirmed;
    const updatedAppointment = await appointment.save();
    notifyCustomer(appointmentId, appointment.calendarSlot, AppointmentStatus.Confirmed);
    return updatedAppointment;
  }

  @Authorized(Roles.ADMIN)
  @Mutation(returns => Appointment)
  async deleteAppointment(@Arg('appointmentId', () => ID!) appointmentId: UUID): Promise<boolean> {
    return delAppointment(appointmentId);
  }
};
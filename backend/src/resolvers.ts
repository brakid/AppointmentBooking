import { Arg, Authorized, FieldResolver, ID, Int, Mutation, Query, Resolver, Root, type ResolverInterface } from 'type-graphql';
import { Appointment, AppointmentStatus, CalendarSlot, Customer } from './types';
import { type UUID } from 'crypto';
import { In, LessThanOrEqual, MoreThanOrEqual, type FindOptionsWhere } from 'typeorm';
import { Duration } from 'typed-duration';
import * as EmailValidator from 'email-validator';

@Resolver(of => CalendarSlot)
export class CustomerResolver {
  @Query(returns => Customer)
  async login(@Arg('name', () => String!, { nullable: false }) name: string, @Arg('emailAddress', () => String!, { nullable: false }) emailAddress: string): Promise<Customer | undefined> {
    return await Customer.findOne({ where: { name, emailAddress } }) || undefined;
  }

  @Mutation(returns => Customer)
  async signup(@Arg('name', () => String!, { nullable: false }) name: string, @Arg('emailAddress', () => String!, { nullable: false }) emailAddress: string): Promise<Customer | undefined> {
    if (!name || name.length < 2) {
      throw new Error('Invalid name');
    }

    if (!emailAddress || !EmailValidator.validate(emailAddress)) {
      throw new Error('Invalid email address');
    }
    
    return await Customer.create({ name, emailAddress }).save();
  }
}

@Resolver(of => CalendarSlot)
export class CalendarSlotResolver implements ResolverInterface<CalendarSlot> {
  @Query(returns => [CalendarSlot])
  async getCalendarSlots(@Arg('startTime', () => Date, { nullable: true }) startTime?: Date, @Arg('endTime', () => Date, { nullable: true }) endTime?: Date, @Arg('available', () => Boolean, { nullable: true }) available?: boolean): Promise<CalendarSlot[]> {
    const whereClauses: FindOptionsWhere<CalendarSlot> = {};
    if (startTime) {
      const startTimestamp = startTime.getTime() / 1000;
      whereClauses['startTimestamp'] = MoreThanOrEqual(startTimestamp);
    }
    if (endTime) {
      const endTimestamp = endTime.getTime() / 1000;
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

  @Authorized('ADMIN')
  @Mutation(returns => CalendarSlot)
  async createCalendarSlot(@Arg('startTime', () => Date!) startTime: Date, @Arg('durationInMinutes', () => Int!, { nullable: true, defaultValue: 30 }) durationInMinutes: number): Promise<CalendarSlot> {
    const startTimestamp = startTime.getTime() / 1000;
    const endTimestamp = startTimestamp + Duration.seconds.from(Duration.minutes.of(durationInMinutes));
    const oneYearAway = Date.now() / 1000 + Duration.seconds.from(Duration.days.of(365));

    if (startTimestamp <= Date.now() / 1000 || startTimestamp > oneYearAway) {
      throw new Error('Invalid start time');
    }

    if (durationInMinutes <= 0 || durationInMinutes >= 60) {
      throw new Error('Invalid duration in minutes');
    }

    if (await CalendarSlot.findOne({ where: [
        { startTimestamp: LessThanOrEqual(startTimestamp), endTimestamp:  MoreThanOrEqual(startTimestamp) },
        { startTimestamp: LessThanOrEqual(endTimestamp), endTimestamp:  MoreThanOrEqual(endTimestamp) },
      ] })) {
      throw new Error('Overlaps with other slot');
    }

    return await CalendarSlot.create({ startTimestamp, endTimestamp, available: true }).save();
  }

  @Authorized('ADMIN')
  @Mutation(returns => Boolean)
  async deleteCalendarSlot(@Arg('id', () => ID!) id: UUID): Promise<Boolean> {
    const calendarSlot = await CalendarSlot.findOne({ where: { id } });
    if (!calendarSlot) {
      return false;
    }

    const appointment = await Appointment.findOne({ where: { calendarSlot }, relations: { calendarSlot: true } }) || undefined;
    if (appointment) {
      throw new Error('Calendar Slot has an appointment, delete appointment first');
    }

    await calendarSlot.remove();
    return true;
  }
}

@Resolver(of => Appointment)
export class AppointmentResolver {
  @Query(returns => [Appointment])
  async getCustomerAppointments(@Arg('customerId', () => ID!) customerId: UUID, @Arg('statuses', () => [AppointmentStatus], { nullable: false, defaultValue: Object.values(AppointmentStatus) }) appointmentStatus: AppointmentStatus[], @Arg('startTime', () => Date, { nullable: true }) startTime?: Date, @Arg('endTime', () => Date, { nullable: true }) endTime?: Date): Promise<Appointment[]> {
    const customer = await Customer.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new Error('No customer found');
    }
    
    const whereClauses: FindOptionsWhere<Appointment> = {};
    whereClauses['customer'] = customer;

    if (appointmentStatus !== undefined) {
      whereClauses['appointmentStatus'] = In(appointmentStatus);
    }
    let appointments = await Appointment.find({ where: whereClauses, relations: { customer: true, calendarSlot: true } });
    if (startTime) {
      const startTimestamp = startTime.getTime() / 1000;
      appointments = appointments.filter(appointment => appointment.calendarSlot.startTimestamp >= startTimestamp);
    }
    if (endTime) {
      const endTimestamp = endTime.getTime() / 1000;
      appointments = appointments.filter(appointment => appointment.calendarSlot.endTimestamp <= endTimestamp);
    }
    return appointments;
  }

  @Authorized('ADMIN')
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
    }
    if (endTime) {
      const endTimestamp = endTime.getTime() / 1000;
      appointments = appointments.filter(appointment => appointment.calendarSlot.endTimestamp <= endTimestamp);
    }
    return appointments;
  }

  @Mutation(returns => Appointment)
  async createAppointment(@Arg('calendarSlotId', () => ID!) calendarSlotId: UUID, @Arg('customerId', () => ID!) customerId: UUID): Promise<Appointment> {
    const customer = await Customer.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new Error('No customer found');
    }

    const calendarSlot = await CalendarSlot.findOne({ where: { id: calendarSlotId } });
    if (!calendarSlot) {
      throw new Error('No calendar slot found');
    }

    if (!calendarSlot.available) {
      throw new Error('Calendar slot not available');
    }

    const existingAppointment = await Appointment.findOne({ where: { calendarSlot }, relations: { customer: true, calendarSlot: true } });
    if (existingAppointment) {
      calendarSlot.available = false;
      await calendarSlot.save();
      throw new Error('Calendar slot not available');
    }

    calendarSlot.available = false;
    await calendarSlot.save();
    return await Appointment.create({ calendarSlot, customer, appointmentStatus: AppointmentStatus.Reserved }).save();
  }

  @Mutation(returns => Appointment)
  async cancelAppointment(@Arg('appointmentId', () => ID!) appointmentId: UUID, @Arg('customerId', () => ID!) customerId: UUID): Promise<boolean> {
    const customer = await Customer.findOne({ where: { id: customerId } });
    if (!customer) {
      throw new Error('No customer found');
    }

    const appointment = await Appointment.findOne({ where: { id: appointmentId } });
    if (!appointment) {
      throw new Error('No appointment found');
    }

    const calendarSlot = appointment.calendarSlot;

    calendarSlot.available = true;
    await calendarSlot.save();
    await appointment.remove();

    return true;
  }

  @Authorized('ADMIN')
  @Mutation(returns => Appointment)
  async confirmAppointment(@Arg('id', () => ID!) id: UUID): Promise<Appointment> {
    const appointment = await Appointment.findOne({ where: { id }, relations: { customer: true, calendarSlot: true } });
    if (!appointment) {
      throw new Error('No appointment found');
    }

    if (appointment.appointmentStatus !== AppointmentStatus.Reserved) {
      throw new Error('Appointment not ready for confirmation');
    }

    appointment.appointmentStatus = AppointmentStatus.Confirmed;
    return await appointment.save();
  }

  @Authorized('ADMIN')
  @Mutation(returns => Appointment)
  async deleteAppointment(@Arg('id', () => ID!) id: UUID): Promise<boolean> {
    const appointment = await Appointment.findOne({ where: { id }, relations: { customer: true, calendarSlot: true } });
    if (!appointment) {
      return false;
    }

    const calendarSlot = appointment.calendarSlot;

    calendarSlot.available = true;
    await calendarSlot.save();
    await appointment.remove();
    return true;
  }
}
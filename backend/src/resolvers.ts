import { Arg, Authorized, FieldResolver, ID, Int, Mutation, Query, Resolver, Root, type ResolverInterface } from 'type-graphql';
import { Appointment, CalendarSlot } from './types';
import { type UUID } from 'crypto';
import { LessThanOrEqual, MoreThanOrEqual, type FindOptionsWhere } from 'typeorm';
import { Duration } from 'typed-duration'

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
  async addCalendarSlot(@Arg('adminToken', () => String!) adminToken: string, @Arg('startTime', () => Date!) startTime: Date, @Arg('durationInMinutes', () => Int!, { nullable: true, defaultValue: 30 }) durationInMinutes: number): Promise<CalendarSlot> {
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

  @Mutation(returns => Boolean)
  async removeCalendarSlot(@Arg('adminToken', () => String!) adminToken: string, @Arg('id', () => ID!) id: UUID): Promise<Boolean> {
    if (adminToken !== Bun.env.ADMIN_TOKEN) {
      throw new Error('Invalid Admin Token');
    }

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
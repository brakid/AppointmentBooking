export enum Month {
  January = 'January',
  February = 'February',
  March = 'March',
  April = 'April',
  May = 'May',
  June = 'June',
  July = 'July',
  August = 'August',
  September = 'September',
  October = 'October',
  November = 'November',
  December = 'December'
};

export enum Weekday {
  Sunday = 'Sunday',
  Monday = 'Monday',
  Tuesday = 'Tuesday',
  Wednesday = 'Wednesday',
  Thursday = 'Thursday',
  Friday = 'Friday',
  Saturday = 'Saturday'
};

export enum DayStatus {
  NotInMonth = 'notInMonth',
  Regular = 'regular',
  Today = 'today',
  DifferentMonth = 'different'
};

export interface Day {
  title: string;
  status: DayStatus;
  slots?: Slot[];
};

export interface Slot {
  id: string;
  title: string;
};

export interface CalendarSlot {
  id: string;
  startTime: Date;
  endTime: Date;
  durationInMinutes: number;
  available: boolean;
};

export enum AppointmentStatus {
  Confirmed = 'Confirmed',
  Reserved = 'Reserved',
  PendingPayment = 'PendingPayment',
};

export interface Appointment {
  id: string;
  appointmentStatus: AppointmentStatus,
  calendarSlot: CalendarSlot,
};
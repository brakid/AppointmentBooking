import { Appointment, AppointmentStatus, CalendarSlot } from './types';

export const toCalendarSlot = (value: any): CalendarSlot => {
  return {
    id: value.id,
    startTime: new Date(value.startTime),
    endTime: new Date(value.endTime),
    durationInMinutes: value.durationInMinutes,
    available: value.available
  }
};

export const toAppointment = (value: any): Appointment => {
  return {
    id: value.id,
    appointmentStatus: value.appointmentStatus as AppointmentStatus,
    calendarSlot: toCalendarSlot(value.calendarSlot),
  };
};

export const formatTime = (hour: number, minutes: number): string => {
  return `${hour.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} UTC`;
};

export const formatDate = (date: Date): string => {
  return `${ date.getUTCDate().toString().padStart(2, '0') }.${ (date.getUTCMonth() + 1).toString().padStart(2, '0') } ${formatTime(date.getUTCHours(), date.getMinutes())}`;
};

export const getDate = (daysDifference: number): Date => {
  const date = Date.now() + daysDifference * (24 * 60 * 60 * 1000);
  return new Date(date);
};
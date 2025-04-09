import { Appointment, AppointmentStatus, CalendarSlot } from "./types";
import { type UUID } from 'crypto';

export const processPayment = async (appointmentId: UUID) => {
  const appointment = await Appointment.findOne({ where: { id: appointmentId }, relations: { customer: true, calendarSlot: true } });
  if (!appointment) {
    throw new Error('No appointment found');
  }

  if (appointment.appointmentStatus == AppointmentStatus.PendingPayment) {
    appointment.appointmentStatus = AppointmentStatus.Reserved;
    await appointment.save();
    notifyCustomer(appointmentId, appointment.calendarSlot, AppointmentStatus.Reserved);
  } else {
    console.log('No action to be taken appointment');
  }
}

export const cancelIfNotPaid = async (appointmentId: UUID) => {
  const appointment = await Appointment.findOne({ where: { id: appointmentId }, relations: { customer: true, calendarSlot: true } });
  if (!appointment) {
    throw new Error('No appointment found');
  }

  if (appointment.appointmentStatus == AppointmentStatus.PendingPayment) {
    console.log('Cancel appointment');
    deleteAppointment(appointmentId);
  } else {
    console.log('No action to be taken appointment');
  }
};

export const notifyCustomer = async (appointmentId: UUID, calendarSlot: CalendarSlot, status: AppointmentStatus | 'CANCELLED') => {
  console.log(`Appointment ${ appointmentId } on ${calendarSlot.startTime} has a new status: ${status}`);
};

export const deleteAppointment = async (appointmentId: UUID) => {
  const appointment = await Appointment.findOne({ where: { id: appointmentId }, relations: { customer: true, calendarSlot: true } });
    if (!appointment) {
      return false;
    }

    const calendarSlot = appointment.calendarSlot;

    calendarSlot.available = true;
    await calendarSlot.save();
    await appointment.remove();

    notifyCustomer(appointmentId, calendarSlot, 'CANCELLED');
    return true;
}
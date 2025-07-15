
import { type NextFunction, type Request, type Response } from 'express';
import { getPendingPaymentAppointments, processPayment } from './actions';

export const validateApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return res.status(401).json({
      error: 'API key is required',
      message: 'Include API key in X-API-Key header'
    });
  }

  const acceptedApiKeys = (Bun.env.API_KEY || '').split(',').map(v => v.trim());

  if (acceptedApiKeys.findIndex(v => v === apiKey) < 0) {
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'The provided API key is not valid'
    });
  }
  
  next();
};

export const webhookHandler = async (req: Request, res: Response) => {
  const appointmentId = req.query['appointmentId'];
  if (!appointmentId) {
    return res.status(400).json({
      error: 'AppointmentId is required',
      message: 'Include appointmentId as query parameter'
    });
  }
  const appointments = await getPendingPaymentAppointments();
  const appointment = appointments.find(appointment => (appointmentId === appointment.id));
  if (!appointment) {
    return res.status(400).json({
      error: 'AppointmentId is invalid',
      message:`AppointmentId ${appointmentId} is not in pending state`
    });
  }

  console.log(appointment.id);
  await processPayment(appointment.id);
  return res.status(200).json({
    message: `Payment for Appointment ${appointmentId} processed`
  });
}
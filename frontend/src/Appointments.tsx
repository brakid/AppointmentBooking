import { gql, useQuery } from '@apollo/client';
import './style.css';
import { formatDate, toAppointment } from './utils';
import { Appointment, AppointmentStatus } from './calendar/types';

const APPOINTMENTS_QUERY = gql`
  query GetCustomerAppointments {
    getCustomerAppointments {
      id
      appointmentStatus
      calendarSlot {
        id
        startTime
        endTime
        durationInMinutes
        available
      }
      customer {
        id
        name
        emailAddress
      }
    }
  }
`;

const Appointments = () => {
  const { loading: loading, error: error, data: data } = useQuery(APPOINTMENTS_QUERY);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error : {error.message}</p>;

  const appointments: Appointment[] = data.getCustomerAppointments.map(toAppointment);

  return (
    <article>
      <h3>Your appointments:</h3>
      <ul>
        { appointments.map((appointment, index) => (
          <li key={ index }>Appointment: { formatDate(appointment.calendarSlot.startTime) } - { appointment.calendarSlot.durationInMinutes } min. - { appointment.appointmentStatus } - { appointment.appointmentStatus === AppointmentStatus.Confirmed && (<a href='#'>Cancel</a>) }</li>
        )) }
      </ul>
    </article>
  )
};

export default Appointments;

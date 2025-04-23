import { gql, useApolloClient, useQuery } from '@apollo/client';
import './style.css';
import { formatDate, getDate, toAppointment } from './utils';
import { Appointment, AppointmentStatus } from './calendar/types';
import { useState } from 'react';

const APPOINTMENTS_QUERY = gql`
  query GetCustomerAppointments($startTime: DateTimeISO, $endTime: DateTimeISO) {
    getCustomerAppointments(startTime: $startTime, endTime: $endTime) {
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
  const client = useApolloClient();
  const [startTime] = useState<Date>(getDate(-30));
  const [endTime] = useState<Date>(getDate(+90));
  const { loading: loading, error: error, data: data } = useQuery(APPOINTMENTS_QUERY, { variables: { startTime, endTime } });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error : {error.message}</p>;

  const appointments: Appointment[] = data.getCustomerAppointments.map(toAppointment);

  const cancel = async (appointmentId: string) => {
    try {
      const response = await client.mutate({ 
        mutation: gql`
          mutation CancelAppointment($appointmentId: ID!) {
            cancelAppointment(appointmentId: $appointmentId)
          }
        `,
        variables: { 
          appointmentId
        }
      });
      const result = response.data;
      console.log(result);
      client.resetStore();
    } catch (err) {
      console.log('Error: ' + err);
    }
  };

  const showAppointment = (appointment: Appointment) => {
    switch (appointment.appointmentStatus) {
      case AppointmentStatus.Confirmed:
        return (<button onClick={ () => cancel(appointment.id) }>Cancel</button>);
      case AppointmentStatus.Reserved:
        return  (<span>waiting for confirmation</span>);
      case AppointmentStatus.PendingPayment:
        return (<><button onClick={ () => {} }>Pay via Ethereum</button>&nbsp;<button onClick={ () => cancel(appointment.id) }>Cancel</button></>);
    }
  };

  return (
    <article>
      <h3>Your appointments:</h3>
      <ul>
        { appointments.map((appointment, index) => (
          <li className={ appointment.calendarSlot.endTime.getTime() < Date.now() ? 'past' : '' } key={ index }>Appointment: { formatDate(appointment.calendarSlot.startTime) } - Duration: { appointment.calendarSlot.durationInMinutes } min. - { appointment.appointmentStatus } - { showAppointment(appointment) }</li>
        )) }
      </ul>
    </article>
  )
};

export default Appointments;
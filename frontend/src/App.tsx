import { gql, useApolloClient, useQuery } from '@apollo/client';
import Login from './Login';
import Appointments from './Appointments';
import Calendar from './calendar/Calendar';
import { CalendarSlot } from './calendar/types';
import './style.css';
import { getDate, toCalendarSlot } from './utils';
import { useState } from 'react';

const CALENDAR_SLOT_QUERY = gql`
  query GetAvailableCalendarSlots($startTime: DateTimeISO, $endTime: DateTimeISO) {
    getCalendarSlots(startTime: $startTime, endTime: $endTime, available: true) {
      id
      startTime
      endTime
      durationInMinutes
      available
    }
  }
`;

const App = () => {
  const client = useApolloClient();
  const [startTime] = useState<Date>(getDate(-30));
  const [endTime] = useState<Date>(getDate(+30));

  const { loading, error, data } = useQuery(CALENDAR_SLOT_QUERY, { variables: { startTime, endTime }});

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error : {error.message}</p>;

  const calendarSlots: CalendarSlot[] = data.getCalendarSlots.map(toCalendarSlot);

  const callback = async (slotId: string): Promise<void> => {
    try {
      const response = await client.mutate({ 
        mutation: gql`
          mutation CreateAppointment($calendarSlotId: ID!) {
            createAppointment(calendarSlotId: $calendarSlotId) {
              id
            }
          }
        `,
        variables: { 
          calendarSlotId: slotId
        }
      });
      const id = response.data.createAppointment;
      console.log(id);
      client.resetStore();
    } catch (err) {
      console.log('Error: ' + err);
    }

    console.log(slotId);
  };

  return (
    <>
      <header><h1>Appointment Management System</h1><Login /></header>
      <section>
        <article>
          <h3>Available Calendar Slots:</h3>
          <Calendar slots={ calendarSlots } callback={ callback } />
        </article>
        <Appointments />
      </section>
      <footer>&copy; 2025 <a href='https://hagen-schupp.me'>Hagen Schupp</a></footer>
    </>
  )
};

export default App;
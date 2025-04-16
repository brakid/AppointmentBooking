import { gql, useQuery } from '@apollo/client';
import Calendar from './calendar/Calendar';
import { CalendarSlot } from './calendar/types';
import './style.css';

const toCalendarSlot = (value: any): CalendarSlot => {
  return {
    id: value.id,
    startTime: new Date(value.startTime),
    endTime: new Date(value.endTime),
    durationInMinutes: value.durationInMinutes,
    available: value.available
  }
}

const CALENDAR_SLOT_QUERY = gql`
  query GetAvailableCalendarSlots {
    getCalendarSlots {
      id
      startTime
      endTime
      durationInMinutes
      available
    }
  }
`;

const App = () => {
  const { loading, error, data } = useQuery(CALENDAR_SLOT_QUERY);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error : {error.message}</p>;

  const calendarSlots: CalendarSlot[] = data.getCalendarSlots.map(toCalendarSlot);

  return (
    <>
      <Calendar slots={ calendarSlots } />
    </>
  )
};

export default App;

import { gql, useQuery } from '@apollo/client';
import Calendar from './calendar/Calendar';


interface CalendarSlot {
  id: string,
  startTime: Date,
  endTime: Date,
  durationInMinutes: number,
  available: boolean
};

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

  console.log(data?.getCalendarSlots);

  return (
    <>
      <ul>
        { data.getCalendarSlots.map((value, index) => (
          <li key={ index }>
            { JSON.stringify(toCalendarSlot(value)) }
          </li>)) }
      </ul>
      <Calendar date={ new Date() } />
    </>
  )
};

export default App

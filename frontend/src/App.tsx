import { gql, useApolloClient, useQuery } from '@apollo/client';
import Login from './Login';
import Appointments from './Appointments';
import Calendar from './calendar/Calendar';
import { CalendarSlot } from './types';
import './style.css';
import { getDate, toCalendarSlot } from './utils';
import { createRef, useEffect, useRef, useState } from 'react';
import Modal, { ModalProps } from './modal/Modal';

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
  const [modalVisibility, setModalVisibility] = useState<boolean>(false);
  const [modalState, setModalState] = useState<ModalProps>({ isOpen: false, onClose: () => {}, title: '', content: (<p></p>), onConfirm: () => {} });

  const openModal = (): void => setModalVisibility(true);
  const closeModal = (): void => setModalVisibility(false);
  
  useEffect(() => {
    setModalState(state => Object.assign(state, { onClose: closeModal }));
  }, []);

  const { loading, error, data } = useQuery(CALENDAR_SLOT_QUERY, { variables: { startTime, endTime }, pollInterval: 60000 });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error : {error.message}</p>;

  const calendarSlots: CalendarSlot[] = data.getCalendarSlots.map(toCalendarSlot);

  const callback = async (slotId: string): Promise<void> => {
    const action = async () => {
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
    };

    setModalState(state =>  Object.assign(state, { title: 'Confirm creation of new appointment', content: (<p>You are about to book an appointent. After reserving the slot, you have 10 minutes to pay via Ethereum to complete the creation otherwise the reservation will be cancelled. Please not that the appointment still needs to be confirmed. You will receive a message to your email-address with the detail of your appointment.</p>), onConfirm: action }))
    openModal();
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
        <Modal isOpen={ modalVisibility } onClose={ modalState.onClose } title={ modalState.title } content={ modalState.content } onConfirm={ modalState.onConfirm } />
      </section>
      <footer>&copy; 2025 <a href='https://hagen-schupp.me'>Hagen Schupp</a></footer>
    </>
  )
};

export default App;
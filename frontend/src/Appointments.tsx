import { gql, useApolloClient, useQuery } from '@apollo/client';
import './style.css';
import { formatDate, getDate, toAppointment } from './utils';
import { Appointment, AppointmentStatus } from './types';
import { useEffect, useState } from 'react';
import { ethers } from 'ethers';

const ESCROW_ABI = [
  'function pay(string calldata appointmentId) external payable',
  'function cost() public view returns (uint256)'
];

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
    }
  }
`;

const Appointments = () => {
  const client = useApolloClient();
  const [startTime] = useState<Date>(getDate(-30));
  const [endTime] = useState<Date>(getDate(+90));
  const { loading: loading, error: error, data: data } = useQuery(APPOINTMENTS_QUERY, { variables: { startTime, endTime }, pollInterval: 60000 });

  const [provider] = useState(new ethers.BrowserProvider((window as any).ethereum, 'any'));
  const [escrowContract, setEscrowContract] = useState<ethers.Contract>();
  const [appointmentPrice, setAppointmentPrice] = useState<BigInt>(0n);

  useEffect(() => {
    const init = async () => {
      try {
        const network = await provider.getNetwork();
        if (network.chainId !== BigInt(import.meta.env.VITE_CHAIN_ID || '')) {
          await provider.send('wallet_switchEthereumChain', [{ chainId: '0x53b' }]);
          window.location.reload();
        }
        const signerProvider = await provider.getSigner();
        const escrowContract = new ethers.Contract(import.meta.env.VITE_CONTRACT_ADDRESS || '', ESCROW_ABI, signerProvider);
        const appointmentPrice = BigInt(await escrowContract.cost());
        setAppointmentPrice(appointmentPrice);
        setEscrowContract(escrowContract);
      } catch (error: any) {
        console.log(error);
      }
    }
    init();
  }, []);

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

  const pay = async (appointmentId: string) => {
    try {
      await escrowContract!.pay(appointmentId, { value: appointmentPrice });
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
        return  (<><span>waiting for confirmation</span>&nbsp;<button onClick={ () => cancel(appointment.id) }>Cancel</button></>);
      case AppointmentStatus.PendingPayment:
        return (<><button title='An Appointment is reserved for 10 minutes before being automatically cancelled' onClick={ () => { pay(appointment.id) } }>Pay via Ethereum: { appointmentPrice.toString() }</button>&nbsp;<button onClick={ () => cancel(appointment.id) }>Cancel</button></>);
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
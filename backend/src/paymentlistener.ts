import * as ethers from 'ethers';
import { getPendingPaymentAppointments, processPayment } from './actions';

const abi = [
  'event Paid(string indexed appointmentId, address indexed customer, uint256 cost)'
];

export const initializePaymentListener = async () => {
  const provider = ethers.getDefaultProvider(process.env.CHAIN_ENDPOINT);
  const address = process.env.CONTRACT_ADDRESS || '';
  const contract = new ethers.Contract(address, abi, provider);

  const paidEventFilter = {
    address: await contract.getAddress(),
    topics:  await contract.filters.Paid().getTopicFilter()
  }

  provider.on(paidEventFilter, async (event) => {
    const [_, appointmentIdHash, customerAddress] = event.topics;

    const appointments = await getPendingPaymentAppointments();
    const appointment = appointments.find(appointment => (appointmentIdHash === ethers.id(appointment.id)));
    if (appointment) {
      console.log(appointment.id + ' : ' + customerAddress);
      await processPayment(appointment.id);
    }
  });
};
import * as ethers from 'ethers';
import * as ContractAbi from './contract_abi.json';

const provider = new ethers.JsonRpcProvider(process.env.CHAIN_ENDPOINT, BigInt(process.env.CHAIN_ID || 0));
console.log(await provider.getBlockNumber());

const network = await provider.getNetwork();
console.log(network.chainId);

const address = process.env.CONTRACT_ADDRESS || '';

const contract = new ethers.Contract(address, ContractAbi.abi);
const filter = { address, topicFilter: await contract.filters.Proof().getTopicFilter() }

provider.on(filter, (event) => {
  const data = event.toJSON();
  const [_, user, caloriesBurnt, energy] = data.topics;
  try {
    console.log([user, ethers.getBigInt(caloriesBurnt), ethers.getBigInt(energy)]);
  } catch (err) {
    console.log(err);
  }
});
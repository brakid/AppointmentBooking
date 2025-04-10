import { expect } from 'chai';
import hre from 'hardhat';
import { v4 as uuidv4 } from 'uuid';

describe('Escrow', function () {
  describe('logic', function () {
    it('should behave as expected', async function () {
      const [owner, customer] = await hre.ethers.getSigners();

      const Escrow = await hre.ethers.getContractFactory('Escrow');
      const escrow = await Escrow.deploy(100n);
      const customerEscrow = escrow.connect(customer);

      expect(await hre.ethers.provider.getBalance(escrow)).to.equal(0n);
      expect(await customerEscrow.cost()).to.equal(100n);
      expect(await escrow.cost()).to.equal(100n);
      // Pay for appointment
      await expect(customerEscrow.pay('', { value: 100n })).to.be.rejectedWith(
        'Invalid appointment id'
      );
      await expect(customerEscrow.pay('id', { value: 0n })).to.be.rejectedWith(
        'Sent wei is smaller than cost'
      );
      await expect(customerEscrow.pay('id', { value: 101n })).to.be.rejectedWith(
        'Sent wei is larger than cost'
      );
      const tx = customerEscrow.pay('id', { value: 100n });
      await expect(tx).to.emit(escrow, 'Paid').withArgs('id', customer, 100n);
      expect(await hre.ethers.provider.getBalance(escrow)).to.equal(100n);
      await expect(customerEscrow.pay('id', { value: 100n })).to.be.rejectedWith(
        'Appointment id is already in use'
      );
      // Refund
      await expect(customerEscrow.refund('')).to.be.rejectedWith(
        'Owner only'
      );
      await expect(escrow.refund('')).to.be.rejectedWith(
        'Invalid appointment id'
      );
      await expect(escrow.refund('id1')).to.be.rejectedWith(
        'Appointment id is not in use'
      );
      await expect(customerEscrow.setCost(50n)).to.be.rejectedWith(
        'Owner only'
      );
      // Cost change ensure we refund the correct amount
      await escrow.setCost(50n);
      expect(await escrow.cost()).to.equal(50n);
      const tx2 = escrow.refund('id');
      expect(await tx2).to.emit(escrow, 'Refund').withArgs('id', customer, 100n);
      expect(await hre.ethers.provider.getBalance(escrow)).to.equal(0n);
      await expect(escrow.refund('id')).to.be.rejectedWith(
        'Appointment id is not in use'
      );
      const tx3 = customerEscrow.pay('id', { value: 50n });
      expect(await tx3).to.emit(escrow, 'Paid').withArgs('id', customer, 50n);
      expect(await hre.ethers.provider.getBalance(escrow)).to.equal(50n);
      await expect(customerEscrow.withdraw()).to.be.rejectedWith(
        'Owner only'
      );
      await escrow.withdraw();
      expect(await hre.ethers.provider.getBalance(escrow)).to.equal(0n);
      await expect(escrow.refund('id')).to.be.rejectedWith(
        'Contract has insufficient funds'
      );
      await owner.sendTransaction({ to: escrow, value: 1000n });
      expect(await hre.ethers.provider.getBalance(escrow)).to.equal(1000n);
      // No cost
      await escrow.setCost(0n);
      expect(await escrow.cost()).to.equal(0n);
      const tx4 = customerEscrow.pay('id2', { value: 0n });
      expect(await tx4).to.emit(escrow, 'Paid').withArgs('id2', customer, 0n);
      expect(await hre.ethers.provider.getBalance(escrow)).to.equal(1000n);
      const tx5 = escrow.refund('id2');
      expect(await tx5).to.emit(escrow, 'Refund').withArgs('id2', customer, 0n);
      expect(await hre.ethers.provider.getBalance(escrow)).to.equal(1000n);
      await expect(escrow.refund('id2')).to.be.rejectedWith(
        'Appointment id is not in use'
      );
    });
  });
});
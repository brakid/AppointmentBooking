import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const EscrowModule = buildModule("EscrowModule", (m) => {
  const cost = m.getParameter("_cost", 100n);
  const escrow = m.contract("Escrow", [cost]);

  return { escrow };
});

export default EscrowModule;

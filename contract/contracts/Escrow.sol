// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract Escrow {
    modifier onlyOwner {
        require(msg.sender == owner, "Owner only");
        _;
    }

    mapping(string => address) private appointmentToAddress;
    mapping(string => uint256) private appointmentToCost;
    uint256 public cost;
    address private immutable owner;

    event Paid(string indexed appointmentId, address indexed customer, uint256 cost);
    event Refunded(string indexed appointmentId, address indexed customer, uint256 cost);

    constructor(uint256 _cost) {
        cost = _cost;
        owner = msg.sender;
    }

    function setCost(uint256 _cost) onlyOwner external {
        cost = _cost;
    }

    receive() onlyOwner external payable {}

    function pay(string calldata appointmentId) external payable {
        if (msg.value < cost) {
            revert("Sent wei is smaller than cost");
        }
        if (msg.value > cost) {
            revert("Sent wei is larger than cost");
        }
        require(bytes(appointmentId).length > 0, "Invalid appointment id");
        require(appointmentToAddress[appointmentId] == address(0), "Appointment id is already in use");

        appointmentToAddress[appointmentId] = msg.sender;
        appointmentToCost[appointmentId] = msg.value;
        emit Paid(appointmentId, msg.sender, msg.value);
    }

    function refund(string calldata appointmentId) onlyOwner external {
        require(bytes(appointmentId).length > 0, "Invalid appointment id");
        address receiver = appointmentToAddress[appointmentId];
        require(receiver != address(0), "Appointment id is not in use");
        uint256 refundCost = appointmentToCost[appointmentId];
        require(address(this).balance >= refundCost, "Contract has insufficient funds");

        payable(receiver).transfer(refundCost);
        delete appointmentToAddress[appointmentId];
        delete appointmentToCost[appointmentId];
        emit Refunded(appointmentId, receiver, refundCost);
    }

    function withdraw() onlyOwner external {
        payable(owner).transfer(address(this).balance);
    }
}
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./IPriceOracle.sol";

interface IETHRegistrarController {
    function register(
        string calldata name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) external payable;

    // Pure function - simply returns hash of the domain
    function makeCommitment(
        string memory name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) external pure returns (bytes32);

    function available(string memory name) external view returns (bool);

    function rentPrice(
        string memory,
        uint256
    ) external view returns (IPriceOracle.Price memory);

    function commit(bytes32 commitment) external;
    function commitments(bytes32 commitment) external view returns (uint256);
}
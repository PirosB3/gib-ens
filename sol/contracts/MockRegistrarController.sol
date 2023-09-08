// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./interfaces/IETHRegistrarController.sol";

contract MockRegistrarController is IETHRegistrarController {

    event DomainRegistered(
        string name,
        address indexed owner,
        uint256 duration,
        bytes32 secret,
        address indexed resolver,
        bytes[] data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    );

    // This function is based on your usage in the previous code.
    // However, the actual computation inside might be different depending on the actual RegistrarController implementation.
    function makeCommitment(
        string memory name,
        address owner,
        uint256 duration,
        bytes32 secret,
        address resolver,
        bytes[] calldata data,
        bool reverseRecord,
        uint16 ownerControlledFuses
    ) public pure override returns (bytes32) {
        bytes32 label = keccak256(bytes(name));
        require(data.length == 0 || resolver != address(0), "Resolver required when supplying data");
        return
            keccak256(
                abi.encode(
                    label,
                    owner,
                    duration,
                    secret,
                    resolver,
                    data,
                    reverseRecord,
                    ownerControlledFuses
                )
            );
    }

    function commit(bytes32 commitment) external {
    }

    function register(
        string calldata _name,
        address _owner,
        uint256 _duration,
        bytes32 _secret,
        address _resolver,
        bytes[] calldata _data,
        bool _reverseRecord,
        uint16 _ownerControlledFuses
    ) public payable override {
        require(msg.value >= 0.5 ether, "Not enough ether sent.");
        emit DomainRegistered(
            _name,
            _owner,
            _duration,
            _secret,
            _resolver,
            _data,
            _reverseRecord,
            _ownerControlledFuses
        );
        payable(msg.sender).transfer(5 gwei);
    }
}
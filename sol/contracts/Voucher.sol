// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "./interfaces/IETHRegistrarController.sol";

// Interface for the ETHRegistrarController

contract Voucher is Ownable, ReentrancyGuard  {
    using SafeMath for uint256;
    using ECDSA for bytes32;

    struct ENSParams {
        string name;
        address _owner;
        uint256 duration;
        bytes32 secret;
        address resolver;
        bytes[] data;
        bool reverseRecord;
        uint16 ownerControlledFuses;
    }

    struct RedeemResult {
        bool isRedeemed;
        bytes32 domainIdentifier;
    }

    event CompletedRegistration(bytes32 indexed policyHash, address indexed owner);

    mapping(address => mapping(bytes32 => RedeemResult)) private redeemed;
    bool public redeemFrozen = false;
    address public authority;
    IETHRegistrarController private registrarController;


    constructor(address _authority, address _registrarController) {
        authority = _authority;
        registrarController = IETHRegistrarController(_registrarController);
    }

    modifier notFrozen() {
        require(!redeemFrozen, "Redemption is currently frozen.");
        _;
    }

    // Function to deposit ETH into the contract
    function deposit() external payable onlyOwner {
        require(msg.value > 0, "Must send some ether.");
    }

    // Function to withdraw ETH from the contract
    function withdraw(uint256 _amount) external onlyOwner {
        require(address(this).balance >= _amount, "Insufficient ether in the contract.");
        payable(msg.sender).transfer(_amount);
    }
    
    function freezeRedeem() external onlyOwner {
        redeemFrozen = true;
    }

    function unfreezeRedeem() external onlyOwner {
        redeemFrozen = false;
    }

    receive() external payable {}

    // Simple function can be used as a catch all solution in case of emergency
    function executeCall(address _to, uint256 _value, bytes calldata _data) external onlyOwner returns (bool, bytes memory) {
        (bool success, bytes memory result) = _to.call{value: _value}(_data);
        require(success, "Call failed.");
        return (success, result);
    }

    function _registerDomain(ENSParams memory ensReg, bytes32 policyHash, uint256 maxPrice) internal {
        require(!redeemed[ensReg._owner][policyHash].isRedeemed, "User has already redeemed for this event.");
        registrarController.register{value: maxPrice}(
            ensReg.name, 
            ensReg._owner, 
            ensReg.duration, 
            ensReg.secret, 
            ensReg.resolver, 
            ensReg.data, 
            ensReg.reverseRecord, 
            ensReg.ownerControlledFuses
        );
        
        bytes32 domainIdentifier = keccak256(abi.encodePacked(ensReg.name));
        redeemed[ensReg._owner][policyHash].isRedeemed = true;
        redeemed[ensReg._owner][policyHash].domainIdentifier = domainIdentifier;
    }

    function _makeCommitment(
        ENSParams calldata params
    ) internal view returns (bytes32) {
        return registrarController.makeCommitment(
            params.name, 
            params._owner, 
            params.duration, 
            params.secret, 
            params.resolver, 
            params.data, 
            params.reverseRecord, 
            params.ownerControlledFuses
        );
    }

    function _verifySignature(
        ENSParams calldata params,
        uint256 maxPrice,
        uint256 expiry,
        bytes calldata signature
    ) internal view {
        bytes32 commitment = _makeCommitment(params);
        bytes memory domain = abi.encodePacked(address(this), commitment, maxPrice, expiry);
        address signer = keccak256(domain).toEthSignedMessageHash().recover(signature);
        require(signer == authority, "Invalid signature");
    }

    function completeENSRegistration(
        bytes32 policyHash,
        uint256 maxPrice,
        uint256 expiry,
        ENSParams calldata params,
        bytes calldata signature
    ) external notFrozen nonReentrant {
        // Cheap simple checks: check that the expiry is in the future, and that the contract has enough balance
        require(block.timestamp <= expiry, "The expiration window has passed.");
        require(address(this).balance >= maxPrice, "Insufficient contract balance for registration");

        // Check signature - this is the most important part of the function. If the signature is valid, then we can
        // be sure that the user has permission to register the domain.
        _verifySignature(params, maxPrice, expiry, signature);

        // This completes the registration. The user will first need to call
        // commit() with the commitment hash, and then call register() once the commitment has been finalized.
        _registerDomain(params, policyHash, maxPrice);
        emit CompletedRegistration(policyHash, params._owner);
    }
}
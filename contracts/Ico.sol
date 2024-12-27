// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Token.sol";
import "./Token2.sol";

contract ICO {
    Token public token;
    address public owner;
    Token2 public usdt;
    uint public presale1EndTime;
    uint public presale2EndTime;
    uint public presale2StartTime;
    uint public remainingTime;
    uint public amountLeftPresale1;
    uint public amountLeftPresale2;
    uint public price;
    enum status {Uninitialized, Active, Paused, Ended} 
    status public icoStatus;

    mapping (address => uint) public balance;

    modifier onlyOwner() {
        require(msg.sender == owner,"Only owner can perform this operation");
        _;
    }

    modifier onlyActive() {
        require(icoStatus == status.Active,"Not active");
        _;
    }

    constructor(address _tokenAddress, address _Token2Address) {
        token = Token(_tokenAddress);
        usdt = Token2(_Token2Address);
        owner = msg.sender;
        icoStatus = status.Uninitialized;
    }

    function setPresale1Time(uint durationInMinutes) public onlyOwner {
        presale1EndTime = block.timestamp + (durationInMinutes * 60);
        icoStatus = status.Active;
        amountLeftPresale1 = (token.totalSupply() * 20) / 100 ether;
    } 

    function setPresale2Time(uint durationInMinutes) public onlyOwner {
        require(block.timestamp >= presale1EndTime, "Presale1 is still active");
        icoStatus = status.Active;
        presale2StartTime = block.timestamp;
        presale2EndTime = block.timestamp + (durationInMinutes * 60);
        amountLeftPresale2 = (token.totalSupply() * 22) / 100 ether;
    }

    function setPrice(uint value) public onlyOwner {
        price = value;
    }

//string input will be either 'unpause' or 'pause'
    function changeStatus(string memory newStatus) public onlyOwner {
        require(icoStatus != status.Ended, "Cannot toggle, campaign has ended");
        require (keccak256(abi.encodePacked(newStatus)) == keccak256(abi.encodePacked("pause")) || 
        keccak256(abi.encodePacked(newStatus)) == keccak256(abi.encodePacked("unpause")));

        // Handle pause and resume for presale1
        if (block.timestamp < presale1EndTime) {
            if (icoStatus == status.Active) {
                require(keccak256(abi.encodePacked(newStatus)) == keccak256(abi.encodePacked("pause")));

                remainingTime = presale1EndTime - block.timestamp;
                icoStatus = status.Paused;
            } else if (icoStatus == status.Paused) {
                require(keccak256(abi.encodePacked(newStatus)) == keccak256(abi.encodePacked("unpause")));

                presale1EndTime = block.timestamp + remainingTime;
                icoStatus = status.Active;
            }
        }
        // Handle pause and resume for presale2
        else if (block.timestamp >= presale1EndTime && block.timestamp < presale2EndTime) {
            if (icoStatus == status.Active) {
                require(keccak256(abi.encodePacked(newStatus)) == keccak256(abi.encodePacked("pause")));
                remainingTime = presale2EndTime - block.timestamp;
                icoStatus = status.Paused;
            } else if (icoStatus == status.Paused) {
                require(keccak256(abi.encodePacked(newStatus)) == keccak256(abi.encodePacked("unpause")));
                presale2EndTime = block.timestamp + remainingTime;
                icoStatus = status.Active;
            }
        } else {
            revert("Invalid state: No active phase to pause or resume");
        }
    }

    function endIcoStatus() public onlyOwner {
        require(icoStatus != status.Ended, "Campaign has already ended");
        icoStatus = status.Ended;
        presale1EndTime = 0;
        presale2EndTime = 0;
    }

    function presale1(uint _amount) public onlyActive {
        require(amountLeftPresale1 >= _amount, "Insufficient balance");
        require(block.timestamp < presale1EndTime, "Time is over");
        uint tokenPrice = _amount * price;
        usdt.transferFrom(msg.sender, address(this), _amount);
        token.transfer(msg.sender, tokenPrice);
        balance[msg.sender] = tokenPrice;
        amountLeftPresale1 -= _amount;
    }

    function presale2(uint _amount) public onlyActive{
        require(amountLeftPresale2 >= _amount, "Insufficient balance");
        if(block.timestamp < presale2EndTime){
            usdt.approve(address(this), _amount);
            uint tokenPrice = _amount * price;
            usdt.transferFrom(msg.sender, address(this), tokenPrice);
            token.transfer(msg.sender, _amount);
            balance[msg.sender] = _amount;
            amountLeftPresale1 -= _amount;
        }
        else {
            token.burn(amountLeftPresale2);
        }
        
    }

    function checkStatus() public view returns (string memory) {
    if (icoStatus == status.Uninitialized) {
        return "Not started yet";
    } else if (icoStatus == status.Active) {
        if (block.timestamp < presale1EndTime) {
            return "Presale1 is running";
        } else if (block.timestamp >= presale1EndTime && block.timestamp < presale2StartTime || icoStatus == status.Ended) {
            return "Presale1 has ended, Presale2 not started yet";
        } else if (block.timestamp >= presale2StartTime && block.timestamp < presale2EndTime) {
            return "Presale2 is running";
        } else if (block.timestamp >= presale2EndTime || icoStatus == status.Ended) {
            return "Presale2 has ended";
        }
    } else if (icoStatus == status.Paused) {
        return "ICO is paused";
    } else if (icoStatus == status.Ended) {
        return "ICO has ended";
    }
    return "Unknown status"; // Fallback for unexpected cases
}


    function withdrawUSDT(address _to) public onlyOwner {
        require(_to != address(0), "Invalid address");
        uint256 usdtBalance = usdt.balanceOf(address(this)); // Get USDT balance of the contract
        require(usdtBalance > 0, "No USDT to withdraw");

        usdt.transfer(_to, usdtBalance); // Transfer USDT to the specified address
    }

    function information() public view returns (uint, uint, uint, string memory){
        uint remainingTokens = amountLeftPresale1 + amountLeftPresale2;
        uint sold = token.totalSupply() - remainingTokens;
        return (price, sold, remainingTokens, checkStatus());
    }
}
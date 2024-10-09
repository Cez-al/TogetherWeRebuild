// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/access/Ownable.sol";  // Importujemy bibliotekę Ownable z OpenZeppelin

contract TogetherWeRebuild is Ownable {  // Dziedziczymy po Ownable
    uint256 public totalFunds;
    uint256 public targetAmount = 100 ether;
    uint256 public campaignEndDate = 1767148800; // 31.12.2025 00:00 UTC
    bool public campaignEnded;

    mapping(address => uint256) public donations;
    mapping(address => bytes32[]) public donationHashes; // Mapowanie do przechowywania hashów dla każdej darowizny
    address[] private contributors; // Tablica do przechowywania adresów darczyńców

    event DonationReceived(address indexed donor, uint256 amount, string username);
    event FundsWithdrawn(address indexed owner, uint256 amount);
    event CampaignCreated(uint256 targetAmount, uint256 endDate);
    event CampaignEnded(bool successful);
    event EmergencyWithdrawal(uint256 amount, address indexed recipient);  // Nowe zdarzenie dla wypłat awaryjnych

    modifier campaignActive() {
        require(block.timestamp < campaignEndDate && !campaignEnded, "Campaign has ended");
        _;  // Kontynuuj wykonanie funkcji
    }

    constructor() Ownable(msg.sender) {  // Przekazujemy msg.sender jako właściciela
        emit CampaignCreated(targetAmount, campaignEndDate);
    }

    function donate(string memory username, bool anonymousDonation) external payable campaignActive {
        require(msg.value >= 0.01 ether, "Minimum donation is 0.01 ETH");

        // Walidacja dla username
        if (!anonymousDonation) {
            require(bytes(username).length > 0, "Username cannot be empty for non-anonymous donations");
        }

        totalFunds += msg.value;
        donations[msg.sender] += msg.value;

        // Dodajemy adres darczyńcy do tablicy, jeśli jeszcze nie istnieje
        if (donations[msg.sender] == 0) {
            contributors.push(msg.sender);
        }

        string memory anonymousDonationName = "Anonymous Donation";
        string memory donorName = anonymousDonation ? anonymousDonationName : username;
        
        // Tworzenie hasha darowizny i zapisanie go
        bytes32 donationHash = keccak256(abi.encodePacked(msg.sender, msg.value, block.timestamp));
        donationHashes[msg.sender].push(donationHash); // Przechowuj hash darowizny dla darczyńcy

        emit DonationReceived(msg.sender, msg.value, donorName);

        if (totalFunds >= targetAmount) {
            endCampaign();
        }
    }

    function getContributors() public view returns (address[] memory contributorAddresses, uint256[] memory donationAmounts) {
        uint256 contributorCount = contributors.length; // Zmieniamy, aby uzyskać liczbę darczyńców
        contributorAddresses = new address[](contributorCount);
        donationAmounts = new uint256[](contributorCount);

        for (uint256 i = 0; i < contributorCount; i++) {
            contributorAddresses[i] = contributors[i];
            donationAmounts[i] = donations[contributors[i]];
        }
    }

    function withdraw() external onlyOwner {
        require(campaignEnded, "Campaign is still active");
        uint256 balance = donations[msg.sender];
        require(balance > 0, "No funds to withdraw");

        donations[msg.sender] = 0;  // Zabezpieczenie przed reentrancy

        (bool success, ) = msg.sender.call{value: balance}("");
        require(success, "Withdrawal failed");

        emit FundsWithdrawn(msg.sender, balance);
    }

    function endCampaign() public onlyOwner {
        require(block.timestamp >= campaignEndDate || totalFunds >= targetAmount, "Campaign not over yet");
        campaignEnded = true;

        emit CampaignEnded(totalFunds >= targetAmount);

        // Wypata wszystkich środków na adres właściciela
        if (address(this).balance > 0) {
            (bool success, ) = owner().call{value: address(this).balance}("");  // Zmieniono na owner() z Ownable
            require(success, "Final withdrawal failed");
        }
    }

    function emergencyWithdraw() external onlyOwner {  // Funkcja awaryjnej wypłaty
        uint256 contractBalance = address(this).balance;
        require(contractBalance > 0, "No funds available");

        (bool success, ) = owner().call{value: contractBalance}("");  // Wypłata pełnego salda właścicielowi
        require(success, "Emergency withdrawal failed");

        emit EmergencyWithdrawal(contractBalance, owner());
    }

    function getCampaignStatus() public view returns (string memory) {
        if (campaignEnded) {
            return totalFunds >= targetAmount ? "Campaign successful" : "Campaign failed";
        } else {
            return "Campaign active";
        }
    }

    receive() external payable campaignActive {
        require(msg.value >= 0.01 ether, "Minimum donation is 0.01 ETH");

        totalFunds += msg.value;
        donations[msg.sender] += msg.value;

        emit DonationReceived(msg.sender, msg.value, "Anonymous");

        if (totalFunds >= targetAmount) {
            endCampaign();
        }
    }
}

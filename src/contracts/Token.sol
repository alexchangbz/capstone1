// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

contract Token {
    string public name = "DApp Token";
    string public symbol = "DAPP";
    uint256 public decimals = 18;
    uint256 public totalSupply;
    
    constructor() {
        totalSupply = 1000000 * 10 ** decimals;
    }
}
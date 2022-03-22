// SPDX-License-Identifier: MIT
pragma solidity ^0.8.11;

import './Token.sol';
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

// Deposit & Withdraw Funds
// Manage Orders - Make or Cancel
// Handle Trades - Charge Fees

// TO DO:
// Set the fee account [x]
// Deposit Ethers [x]
// Withdraw Ethers [x]
// Deposit tokens [x]
// Withdraw tokens [x]
// Check balances [x]
// Make order [x]
// Cancel order [x]
// Fill order [x]

contract Exchange {
    using SafeMath for uint;

    address public feeAccount;
    address constant Ether = address(0); // allow to store ether in blank address
    uint256 public feePercent;
    uint256 public orderCount = 0;
    mapping(address => mapping(address => uint256)) public tokens;
    mapping(uint256 => _Order) public orders;
    mapping(uint256 => bool) public orderCancelled;
    mapping(uint256 => bool) public orderFilled;

    // Events
    event Deposit(address token, address user, uint256 amount, uint256 balance);
    event Withdraw(address token, address user, uint256 amount, uint256 balance);
    event Order(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 timestamp);
    event Cancel(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, uint256 timestamp);
    event Trade(uint256 id, address user, address tokenGet, uint256 amountGet, address tokenGive, uint256 amountGive, address userFill, uint256 timestamp);

    struct _Order {
        uint256 id;
        address user;
        address tokenGet;
        uint256 amountGet;
        address tokenGive;
        uint256 amountGive;
        uint256 timestamp;
    }

    constructor(address _feeAccount, uint256 _feePercent) {
        feeAccount = _feeAccount;
        feePercent = _feePercent;
    }

    // If ether is directly sent to this exchange
    fallback() external {
        revert();
    }

    function depositEther() payable public {
        tokens[Ether][msg.sender] = tokens[Ether][msg.sender].add(msg.value);
        emit Deposit(Ether, msg.sender, msg.value, tokens[Ether][msg.sender]);
    }

    function withdrawEther(uint256 _amount) payable public {
        require(tokens[Ether][msg.sender] >= _amount, 'insufficient balance');
        tokens[Ether][msg.sender] = tokens[Ether][msg.sender].sub(_amount);
        payable(msg.sender).transfer(_amount);
        emit Withdraw(Ether, msg.sender, _amount, tokens[Ether][msg.sender]);
    }

    function depositToken(address _token, uint256 _amount) public {
        // Check if it is ether address
        require(_token != Ether, "you've input an ether address");
        // Which token?
        require(Token(_token).transferFrom(msg.sender, address(this), _amount));
        tokens[_token][msg.sender] = tokens[_token][msg.sender].add(_amount);
        // How much?
        // Manage deposit - update balance
        // Emit event
        emit Deposit(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function withdrawToken(address _token, uint256 _amount) public {
        require(_token != Ether);
        require(tokens[_token][msg.sender] >= _amount);
        tokens[_token][msg.sender] = tokens[_token][msg.sender].sub(_amount);
        require(Token(_token).transfer(msg.sender, _amount));
        emit Withdraw(_token, msg.sender, _amount, tokens[_token][msg.sender]);
    }

    function balanceOf(address _token, address _user) public view returns(uint256) {
        return tokens[_token][_user];
    }

    function makeOrder(address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) public {
        orders[orderCount] = _Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, block.timestamp);
        emit Order(orderCount, msg.sender, _tokenGet, _amountGet, _tokenGive, _amountGive, block.timestamp);
        orderCount = orderCount.add(1);
    }

    function cancelOrder(uint256 _id) public {
        _Order memory _order = orders[_id];
        // check must be the owner order
        require(msg.sender == _order.user);
        require(orderCancelled[_id] != true);
        require(orderFilled[_id] != true);
        orderCancelled[_id] = true;
        emit Cancel(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive, block.timestamp);
    }

    function fillOrder(uint256 _id) public {
        require(_id > 0 && _id <= orderCount);
        require(orderCancelled[_id] != true);
        require(orderFilled[_id] != true);
        // Fetch the order
        _Order memory _order = orders[_id];
        _trade(_order.id, _order.user, _order.tokenGet, _order.amountGet, _order.tokenGive, _order.amountGive);
        // Mark Order as Filled
        orderFilled[_id] = true;
    }

    function _trade(uint256 _id, address _user, address _tokenGet, uint256 _amountGet, address _tokenGive, uint256 _amountGive) internal {
        // Fee deducted from _amountGet
        uint256 _feeAmount = _amountGive.mul(feePercent).div(100);
        // Execute Trade
        tokens[_tokenGet][msg.sender] = tokens[_tokenGet][msg.sender].sub(_amountGet.add(_feeAmount));
        tokens[_tokenGet][_user] = tokens[_tokenGet][_user].add(_amountGet);
        tokens[_tokenGive][msg.sender] = tokens[_tokenGive][msg.sender].add(_amountGive);
        tokens[_tokenGive][_user] = tokens[_tokenGive][_user].sub(_amountGive);
        // Charge Fee
        tokens[_tokenGet][feeAccount] = tokens[_tokenGet][feeAccount].add(_feeAmount);
        // Emit Trade Event
        emit Trade(_id, _user, _tokenGet, _amountGet, _tokenGive, _amountGive, msg.sender, block.timestamp);
    }
}


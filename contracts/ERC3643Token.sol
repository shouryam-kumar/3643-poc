// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title ERC3643Token
 * @dev Implementation of the ERC-3643 token standard
 */
contract ERC3643Token is ERC20, Ownable {
    using Counters for Counters.Counter;

    // Token metadata
    string private _tokenSymbol;
    string private _tokenName;
    uint8 private _decimals;

    // Token status
    bool public isActive;
    bool public isTransferable;
    bool public isBurnable;
    bool public isMintable;

    // Token holders
    mapping(address => bool) public isHolder;
    Counters.Counter private _holderCount;

    // Events
    event TokenActivated(address indexed by);
    event TokenDeactivated(address indexed by);
    event TransferabilityChanged(bool isTransferable);
    event BurnabilityChanged(bool isBurnable);
    event MintabilityChanged(bool isMintable);
    event HolderAdded(address indexed holder);
    event HolderRemoved(address indexed holder);

    /**
     * @dev Constructor that initializes the token
     * @param name_ The name of the token
     * @param symbol_ The symbol of the token
     * @param decimals_ The number of decimals the token uses
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_
    ) ERC20(name_, symbol_) Ownable(msg.sender) {
        _tokenName = name_;
        _tokenSymbol = symbol_;
        _decimals = decimals_;
        
        // Initialize token properties
        isActive = true;
        isTransferable = true;
        isBurnable = true;
        isMintable = true;
    }

    /**
     * @dev Returns the number of decimals used to get its user representation
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }

    /**
     * @dev Activates the token
     */
    function activate() external onlyOwner {
        require(!isActive, "Token is already active");
        isActive = true;
        emit TokenActivated(msg.sender);
    }

    /**
     * @dev Deactivates the token
     */
    function deactivate() external onlyOwner {
        require(isActive, "Token is already inactive");
        isActive = false;
        emit TokenDeactivated(msg.sender);
    }

    /**
     * @dev Sets the transferability of the token
     * @param _isTransferable The new transferability status
     */
    function setTransferable(bool _isTransferable) external onlyOwner {
        isTransferable = _isTransferable;
        emit TransferabilityChanged(_isTransferable);
    }

    /**
     * @dev Sets the burnability of the token
     * @param _isBurnable The new burnability status
     */
    function setBurnable(bool _isBurnable) external onlyOwner {
        isBurnable = _isBurnable;
        emit BurnabilityChanged(_isBurnable);
    }

    /**
     * @dev Sets the mintability of the token
     * @param _isMintable The new mintability status
     */
    function setMintable(bool _isMintable) external onlyOwner {
        isMintable = _isMintable;
        emit MintabilityChanged(_isMintable);
    }

    /**
     * @dev Adds a holder to the token
     * @param holder The address of the holder to add
     */
    function addHolder(address holder) external onlyOwner {
        require(!isHolder[holder], "Address is already a holder");
        isHolder[holder] = true;
        _holderCount.increment();
        emit HolderAdded(holder);
    }

    /**
     * @dev Removes a holder from the token
     * @param holder The address of the holder to remove
     */
    function removeHolder(address holder) external onlyOwner {
        require(isHolder[holder], "Address is not a holder");
        isHolder[holder] = false;
        _holderCount.decrement();
        emit HolderRemoved(holder);
    }

    /**
     * @dev Returns the total number of holders
     */
    function getHolderCount() external view returns (uint256) {
        return _holderCount.current();
    }

    /**
     * @dev Mints new tokens
     * @param to The address that will receive the minted tokens
     * @param amount The amount of tokens to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        require(isActive, "Token is not active");
        require(isMintable, "Token is not mintable");
        require(to != address(0), "Cannot mint to zero address");
        
        _mint(to, amount);
        
        if (!isHolder[to]) {
            isHolder[to] = true;
            _holderCount.increment();
            emit HolderAdded(to);
        }
    }

    /**
     * @dev Burns tokens
     * @param amount The amount of tokens to burn
     */
    function burn(uint256 amount) external {
        require(isActive, "Token is not active");
        require(isBurnable, "Token is not burnable");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        _burn(msg.sender, amount);
        
        if (balanceOf(msg.sender) == 0 && isHolder[msg.sender]) {
            isHolder[msg.sender] = false;
            _holderCount.decrement();
            emit HolderRemoved(msg.sender);
        }
    }

    /**
     * @dev Transfers tokens
     * @param to The address that will receive the tokens
     * @param amount The amount of tokens to transfer
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        require(isActive, "Token is not active");
        require(isTransferable, "Token is not transferable");
        require(to != address(0), "Cannot transfer to zero address");
        
        bool success = super.transfer(to, amount);
        
        if (success) {
            if (!isHolder[to]) {
                isHolder[to] = true;
                _holderCount.increment();
                emit HolderAdded(to);
            }
            
            if (balanceOf(msg.sender) == 0 && isHolder[msg.sender]) {
                isHolder[msg.sender] = false;
                _holderCount.decrement();
                emit HolderRemoved(msg.sender);
            }
        }
        
        return success;
    }

    /**
     * @dev Transfers tokens from one address to another
     * @param from The address that will send the tokens
     * @param to The address that will receive the tokens
     * @param amount The amount of tokens to transfer
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        require(isActive, "Token is not active");
        require(isTransferable, "Token is not transferable");
        require(to != address(0), "Cannot transfer to zero address");
        
        bool success = super.transferFrom(from, to, amount);
        
        if (success) {
            if (!isHolder[to]) {
                isHolder[to] = true;
                _holderCount.increment();
                emit HolderAdded(to);
            }
            
            if (balanceOf(from) == 0 && isHolder[from]) {
                isHolder[from] = false;
                _holderCount.decrement();
                emit HolderRemoved(from);
            }
        }
        
        return success;
    }
} 
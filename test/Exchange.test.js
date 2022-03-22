const { assert } = require("chai")

require("chai")
    .use(require('chai-as-promised'))
    .should()

const Token = artifacts.require('Token')    
const Exchange = artifacts.require('Exchange')

contract('Exchange', ([deployer, feeAccount, user1, user2, user3]) => {

    let token
    let exchange
    const feePercent = 10

    beforeEach(async () => {
        token = await Token.new()
        exchange = await Exchange.new(feeAccount, feePercent)
        token.transfer(user1, web3.utils.toWei('10', 'ether'), { from: deployer })
    })

    describe('deployment', () => {
        it("tracks the fee account", async () => {
            const result = await exchange.feeAccount()
            result.should.equal(feeAccount)
        })

        it("tracks the fee account", async () => {
            const result = await exchange.feePercent()
            result.toString().should.equal(feePercent.toString())
        })
    })

    describe('fallback', () => {
        const errorMsg = "VM Exception while processing transaction: revert"
        it('reverts when Ether is sent', async () => {
            await exchange.sendTransaction({ value: web3.utils.toWei('1', 'ether'), from: user1 }).should.be.rejectedWith(errorMsg)
        })
    })

    describe('depositing ether', () => {
        let result
        let ether_amount
        const ETHER_ADD = "0x0000000000000000000000000000000000000000"

        beforeEach(async () => {
            ether_amount = web3.utils.toWei('0.01', 'ether')
            result = await exchange.depositEther({ from: user1, value: ether_amount })
        })

        it('tracks the ether deposit', async () => {
            const balance = await exchange.tokens(ETHER_ADD, user1)
            balance.toString().should.equal(ether_amount.toString())
        })

        it('emits a Deposit event', async () => {
            // console.log(result)
            let balance
            const log = result.logs[0]
            assert.equal(log.event, 'Deposit')
            const event = log.args
            // console.log(event)
            balance = await exchange.tokens(ETHER_ADD, user1)
            event.token.toString().should.equal(ETHER_ADD, 'ether address is correct')
            event.user.toString().should.equal(user1, 'user address is correct')
            event.amount.toString().should.equal(ether_amount, 'amount is correct')
            event.balance.toString().should.equal(balance.toString(), 'user token balance is correct')
        })
    })

    describe('depositing tokens', () => {
        let result
        let amount

        beforeEach(() => {
            amount =  web3.utils.toWei('10', 'ether')
        })

        describe('success', () => {
            beforeEach(async () => {
                await token.approve(exchange.address, amount, { from: user1 })
                result = await exchange.depositToken(token.address, amount, { from: user1 })
            })

            it('tracks the token deposit', async () => {
                // Check exchange token balance
                let balance
                balance = await token.balanceOf(exchange.address)
                balance.toString().should.equal(amount.toString())
                balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal(amount.toString())
            })

            it('emits a Deposit event', async () => {
                // console.log(result)
                let balance
                const log = result.logs[0]
                assert.equal(log.event, 'Deposit')
                const event = log.args
                // console.log(event)
                balance = await exchange.tokens(token.address, user1)
                event.token.toString().should.equal(token.address, 'token address is correct')
                event.user.toString().should.equal(user1, 'user address is correct')
                event.amount.toString().should.equal(amount, 'amount is correct')
                event.balance.toString().should.equal(balance.toString(), 'user token balance is correct')
            })
        })

        describe('failure', () => {
            const errorMsg = "VM Exception while processing transaction: revert"
            const ETHER_ADD = "0x0000000000000000000000000000000000000000"

            it("rejects Ether deposits", async () => {
                await exchange.depositToken(ETHER_ADD, amount, { from: user1 })
                    .should.be.rejectedWith(errorMsg)
            })

            it("fails when no tokens are approved", async () => {
                await exchange.depositToken(token.address, amount, { from: user1 })
                    .should.be.rejectedWith(errorMsg)
            })
        })
    })

    describe('withdrawing ether', () => {
        let result
        let amount
        const ETHER_ADD = "0x0000000000000000000000000000000000000000"
        const errorMsg = "VM Exception while processing transaction: revert"

        beforeEach(async () => {
            // Deposit Ether
            amount = web3.utils.toWei('0.02', 'ether')
            await exchange.depositEther({ from: user1, value: amount })
        })

        describe('success', async () => {
            beforeEach(async () => {
                // Withdraw Ether
                result = await exchange.withdrawEther(amount, { from: user1 })
            })

            it('withdraw ether fund', async () => {
                const balance = await exchange.tokens(ETHER_ADD, user1)
                balance.toString().should.equal('0')
            })

            it('emits a Withdraw event', async () => {
                const log = result.logs[0]
                log.event.should.equal('Withdraw')
                const event = log.args
                event.token.should.equal(ETHER_ADD)
                event.user.should.equal(user1)
                event.amount.toString().should.equal(amount)
                event.balance.toString().should.equal('0')
            })
        })

        describe('failure', async () => {
            const invalidAmount = web3.utils.toWei('50', 'ether')
            it('rejects withdraws for insufficient balances', async () => {
                await exchange.withdrawEther(invalidAmount, { from: user1 }).should.be.rejectedWith(errorMsg)
            })
        })
    })

    describe('withdrawing tokens', () => {
        let result
        let amount
        const ETHER_ADD = "0x0000000000000000000000000000000000000000"
        const errorMsg = "VM Exception while processing transaction: revert"

        describe('success', async () => {
            beforeEach(async () => {
                amount = web3.utils.toWei('0.1', 'ether')
                await token.approve(exchange.address, amount, { from: user1 })
                await exchange.depositToken(token.address, amount, { from: user1 })

                result = await exchange.withdrawToken(token.address, amount, { from: user1 })
            })

            it('withdraw token fund', async () => {
                const balance = await exchange.tokens(token.address, user1)
                balance.toString().should.equal('0')
            })

            it('emits the Withdraw event', async () => {
                const log = result.logs[0]
                log.event.should.equal('Withdraw')
                const event = log.args
                event.token.should.equal(token.address)
                event.user.should.equal(user1)
                event.amount.toString().should.equal(amount)
                event.balance.toString().should.equal('0')
            })
        })

         describe('failure', async () => {
            amount = web3.utils.toWei('100', 'ether')

            it('rejects Ether withdraws', async () => {
                await exchange.withdrawToken(ETHER_ADD, amount, { from: user1 }).should.be.rejectedWith(errorMsg)
            })

            it('fails for insufficient balances', async () => {
                await exchange.withdrawToken(token.address, amount, { from: user1 }).should.be.rejectedWith(errorMsg)
            })
        })
    })

    describe('checking balances', () => {
        let amount = web3.utils.toWei('1', 'ether')
        const ETHER_ADD = "0x0000000000000000000000000000000000000000"

        beforeEach(async () => {
            await exchange.depositEther({ from: user1, value: amount })
        })

        it('return user balance', async () => {
            const result = await exchange.balanceOf(ETHER_ADD, user1)
            result.toString().should.equal(amount.toString()) 
        })
    })

    describe("making orders", () => {
        let result
        let amount = web3.utils.toWei('0.5', 'ether')
        const errorMsg = "VM Exception while processing transaction: revert"
        const ETHER_ADD = "0x0000000000000000000000000000000000000000"

        beforeEach(async () => {
            result = await exchange.makeOrder(token.address, amount, ETHER_ADD, amount, { from: user1 })
        })

        it("tracks the newly created order", async () => {
            const orderCount = await exchange.orderCount()
            orderCount.toString().should.equal('1')
            const order = await exchange.orders('0')
            order.id.toString().should.equal('0')
            order.user.should.equal(user1)
        })
    })

    describe("order actions", () => {
        let result
        let amount = web3.utils.toWei('1', 'ether')
        const errorMsg = "VM Exception while processing transaction: revert"
        const ETHER_ADD = "0x0000000000000000000000000000000000000000"

        beforeEach(async () => {
            // user1 deposit ether
            await exchange.depositEther({ from: user3, value: amount })
            // give token to user2
            await token.transfer(user2, web3.utils.toWei('100', 'ether'), { from: deployer })
            // user2 deposit token only
            await token.approve(exchange.address, web3.utils.toWei('5', 'ether'), { from: user2 })
            await exchange.depositToken(token.address, web3.utils.toWei('5', 'ether'), { from: user2 })
            // user1 makes an order to buy tokens with Ether
            await exchange.makeOrder(token.address, amount, ETHER_ADD, amount, { from: user1 })
            // user2 makes and order to buy tokens with Ether
            await exchange.makeOrder(token.address, amount, ETHER_ADD, amount, { from: user2 })
            // user3 makes an order to buy tokens with Ether
            await exchange.makeOrder(token.address, amount, ETHER_ADD, amount, { from: user3 })
        })

        describe('filing in orders', () => {
            let balance
            
            describe('success', async () => {
                beforeEach(async () => {
                    // user2 fills order
                    result = await exchange.fillOrder(2, { from: user2 })
                    // balance = await exchange.balanceOf(token.address, user2)
                    // console.log(balance.toString())
                })

                it('executes the trade & charges fee', async () => {
                    balance = await exchange.balanceOf(token.address, user3)
                    balance.toString().should.equal(amount.toString())
                    balance = await exchange.balanceOf(ETHER_ADD, user3)
                    balance.toString().should.equal('0')
                    balance = await exchange.balanceOf(ETHER_ADD, user2)
                    balance.toString().should.equal(amount.toString())
                    balance = await exchange.balanceOf(token.address, user2)
                    const tokenBal = web3.utils.toWei('3.9', 'ether')
                    balance.toString().should.equal(tokenBal.toString())
                })

                it('updates filled orders', async () => {
                    const orderFilled = await exchange.orderFilled(2)
                    orderFilled.should.equal(true)
                })

                it('emits a Trade event', async () => {
                    const log = result.logs[0]
                    log.event.should.equal('Trade')
                    const event = log.args
                    event.id.toString().should.equal('2', 'order id is correct')
                    event.user.should.equal(user3, 'user is correct')
                })
            })

            describe('failure', async () => {
                it('rejects invalid order id', async () => {
                    const invalidOrder = 9999
                    await exchange.fillOrder(invalidOrder, { from: user2 }).should.be.rejectedWith(errorMsg)
                })

                it('rejects already filled order', async () => {
                    await exchange.fillOrder(2, { from: user2 }).should.be.fulfilled
                    await exchange.fillOrder(2, { from: user2 }).should.be.rejectedWith(errorMsg)
                })

                it('rejects cancelled order', async () => {
                    await exchange.cancelOrder(2, { from: user3 }).should.be.fulfilled
                    await exchange.fillOrder(2, { from: user2 }).should.be.rejectedWith(errorMsg)
                })
            })
        })

        describe('cancelling orders', () => {
            
            describe('success', async () => {
                beforeEach(async () => {
                    result = await exchange.cancelOrder(0, { from: user1 })
                })

                it('update cancelled orders', async () => {
                    const orderCancelled = await exchange.orderCancelled(0)
                    // console.log(orderCancelled)
                    orderCancelled.should.equal(true)
                })

                it('emits a Cancel event', async () => {
                    const log = result.logs[0]
                    log.event.should.equal('Cancel')
                    const event = log.args
                    event.id.toString().should.equal('0')
                    event.user.toString().should.equal(user1)
                })
            })

            describe('failure', () => {
                 beforeEach(async () => {
                    result = await exchange.cancelOrder(0, { from: user1 })
                })

                it('rejects invalid order id', async () => {
                    const invalidOrder = 999
                    await exchange.cancelOrder(invalidOrder, { from: user1 }).should.be.rejectedWith(errorMsg)
                })

                it('rejects order that had been cancelled', async () => {
                    await exchange.cancelOrder(0, { from: user1 }).should.be.rejectedWith(errorMsg)
                })

                it('rejects unauthorized cancellations', async () => {
                    await exchange.cancelOrder(1, { from: user1 }).should.be.rejectedWith(errorMsg)
                })
            })

        })

        
    })
    

    
}) 



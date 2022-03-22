const { assert } = require("chai")
var should = require('chai').should()

const Token = artifacts.require('Token')

contract('Token', ([deployer, receiver, exchange]) => {

    // const tokens = (n) => {
    //     return web3.utils.BN(
    //         web3.utils.toWei(n.toString(), 'ether')
    //     )
    // }

    const name = "DApp Token"
    const symbol = "DAPP"
    const decimals = 18
    const totalSupply = '1000000000000000000000000'

    let token

    beforeEach(async () => {
        token = await Token.deployed()
    })

    describe('deployment', () => {
        it('tracks the name', async () => {
            // Read token name here
            const result = await token.name()
            assert.equal(result, name)
        })

        it('tracks the symbol', async () => {
            const result = await token.symbol()
            assert.equal(result, symbol)
        })

        it('tracks the decimals', async () => {
            const result = await token.decimals()
            assert.equal(result, decimals)
        })

        it('tracks the total supply', async () => {
            const result = await token.totalSupply()
            const conResult = result.toString()
            assert.equal(conResult, totalSupply)
        })

        it('assigns the total supply to the deployer', async () => {
            const result = await token.balanceOf(deployer)
            const conResult = result.toString()
            assert.equal(conResult, totalSupply)
        })
    })

    describe("sending tokens", () => {
        
        let result
        let amount

        beforeEach( async () => {
            amount = web3.utils.toWei("3", "ether")
            await token.approve(exchange, amount, { from: deployer })
        })

        describe("success", () => {
            beforeEach( async () => {    
                result = await token.transferFrom(deployer, receiver, amount, { from: exchange })
            })

            it("transfer token balances", async () => {
                let balanceOf
                // Before Transfer
                // balanceOf = await token.balanceOf(deployer)
                // console.log("deployer balance before transfer", balanceOf.toString())
                // balanceOf = await token.balanceOf(receiver)
                // console.log("receiver balance before transfer", balanceOf.toString())

                // Balance After
                balanceOf = await token.balanceOf(deployer)
                console.log("deployer balance after transfer", balanceOf.toString())
                assert.equal(balanceOf.toString(), web3.utils.toWei("999997", "ether").toString())

                balanceOf = await token.balanceOf(receiver)
                console.log("receiver balance after transfer", balanceOf.toString())
                assert.equal(balanceOf.toString(), web3.utils.toWei("3", "ether").toString())
            })  

            it("resets the allowance", async () => {
                const allowance = await token.allowance(deployer, exchange)
                allowance.toString().should.equal('0')
            })

            it("emits a transfer event", async () => {
                const log = result.logs[0]
                assert.equal(log.event, 'Transfer')
                const event = log.args
                assert.equal(event.from.toString(), deployer)
                assert.equal(event.to.toString(), receiver)
                assert.equal(event.value.toString(), web3.utils.toWei("3", "ether").toString())
            })
        })

        describe("failure", () => {

            it("rejects insufficient balance", async () => {
                let invalidAmount = web3.utils.toWei("10000000", "ether")
  
                const errorCheck = async () => {
                    try {
                        await token.transfer(receiver, invalidAmount, { from: deployer })
                        return true
                    } catch (error) {
                        return false
                    }
                }

                const testResult = await errorCheck()
                testResult.should.be.false
            })

            it("rejects invalid recipients", async () => {
                let amount = web3.utils.toWei("3", "ether")
                const errorCheck = async () => {
                    try {
                        await token.transfer(0x0, amount, { from: deployer })
                        return true
                    } catch (error) {
                        return false
                    }
                }

                const testResult = await errorCheck()
                testResult.should.be.false    
            })

        })

    })

    describe("delegated token transfers", () => {
        let result
        let amount

        beforeEach(async () => {
            amount = web3.utils.toWei("10", "ether")
            result = await token.approve(exchange, amount, { from: deployer })
        })

        describe("success", () => {
            it("allocates an allowance for delegated token spending", async () => {
                const allowance = await token.allowance(deployer, exchange)
                allowance.toString().should.equal(amount.toString())
            })

            it("emits an Approval event", async () => {
                const log = result.logs[0]
                assert.equal(log.event, 'Approval')
                const event = log.args
                assert.equal(event.owner.toString(), deployer)
                assert.equal(event.spender.toString(), exchange)
                assert.equal(event.value.toString(), web3.utils.toWei("10", "ether").toString())
            })
        })

        describe("failure", () => {
            let invalidAmount = web3.utils.toWei("10000000", "ether")

            it("reject insufficient amount", async () => {
                const errorCheck = async () => {
                    try {
                        await token.transferFrom(deployer, receiver, invalidAmount, { from: exchange })
                        return true
                    } catch (error) {
                        console.log(error.reason)
                        return false
                    }
                } 
                const testResult = await errorCheck()
                testResult.should.be.false 
            })

            it("rejects invalid spenders", async () => {
                const errorCheck = async () => {
                    try {
                        await token.approve(0x0, amount, { from: deployer })
                        return true
                    } catch (error) {
                        console.log(error.reason)
                        return false
                    }
                }

                const testResult = await errorCheck()
                testResult.should.be.false  
            })

            it("rejects invalid recipients", async () => {
                const errorCheck = async () => {
                    try {
                        await token.transferFrom(deployer, 0x0, amount, { from: exchange })
                        return true
                    } catch (error) {
                        console.log(error.reason)
                        return false
                    }
                }

                const testResult = await errorCheck()
                testResult.should.be.false 
            })
        })
    })

})
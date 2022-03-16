const { assert } = require("chai")

const Token = artifacts.require('Token')

contract('Token', (accounts) => {

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
            console.log(conResult)
            assert.equal(conResult, totalSupply)
        })
    })

})
const Token = artifacts.require("Token");

module.exports = function (deployer) {
  deployer.deploy(Token, "Hello World, Token");
};

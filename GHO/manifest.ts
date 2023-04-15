import { Manifest } from './deps.ts'
import aToken from './ABI/aToken.ts'
import sDebtToken from './ABI/sDebtToken.ts'
import vDebtToken from './ABI/vDebtToken.ts'


import { AccountCollateral, AccountDebt } from './entities.ts'
// import { transferHandler } from './transferHandler.ts'
import { mintHandler } from './mintHandler.ts'
import { burnHandler } from './burnHandler.ts'


const manifest = new Manifest('simple')

const sepolia = manifest
	.addEntity(AccountCollateral)
	.addEntity(AccountDebt)
	.chain('sepolia', { blockRange: 100n })
	.contract(aToken)
	.addSources({  
	'0x67550Df3290415611F6C140c81Cd770Ff1742cb9':  3192709n,
  '0xD21A6990E47a07574dD6a876f6B5557c990d5867':  3192709n,
  '0x55D45c6649a0Ff74097d66aa6A6ae18a66Bb2fF3':  3192709n,
  '0x89B6d1393D1066f88eAfd8BA50cE13307529FC95':  3192709n,
  '0xE1a933729068B0B51452baC510Ce94dd9AB57A11':  3192709n,
  '0xFbE6E10f1E7B15e2e7904a5ca249a8b6dF8d4309':  3192709n,
  '0xD3B304653E6dFb264212f7dd427F9E926B2EaA05':  3192709n,
  '0x0C4b9F731696bEd1b0834F48A7f24e513dC3CfD7':  3192709n })
	.addEventHandlers({ 'Mint': mintHandler, 'Burn' : burnHandler })

	/* 
[aEthDAI,0x67550Df3290415611F6C140c81Cd770Ff1742cb9
[aEthLINK,0xD21A6990E47a07574dD6a876f6B5557c990d5867
[aEthUSDC,0x55D45c6649a0Ff74097d66aa6A6ae18a66Bb2fF3
[aEthWBTC,0x89B6d1393D1066f88eAfd8BA50cE13307529FC95
[aEthWETH,0xE1a933729068B0B51452baC510Ce94dd9AB57A11
[aEthUSDT,0xFbE6E10f1E7B15e2e7904a5ca249a8b6dF8d4309
[aEthAAVE,0xD3B304653E6dFb264212f7dd427F9E926B2EaA05
[aEthEURS,0x0C4b9F731696bEd1b0834F48A7f24e513dC3CfD7

	*/
	/*
	sepolia.contract(sDebtToken)
	.addSources({ '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2': 3192709n })
	
	sepolia.contract(vDebtToken)
	.addSources({ '0x2f7E653ff781d086C3BEcfb1Ca4381Ae22bECD03': 3192709n })

	*/
	

export default manifest.build()

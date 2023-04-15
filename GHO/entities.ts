import { createEntity } from './deps.ts'

interface IBalance {
	account: string
	amount: number
	token: string
	timestamp: number
}

interface IAccountCollateral {
	account: string
	collateralAmountTotal: number
	token: string
	timestamp: number
}


export const AccountCollateral = createEntity<IAccountCollateral>('AccountCollateral', {
	account : String, 
	collateralAmountTotal : Number, 
	token : String,
	timestamp: {
		type: Number,
		index: true,
	}
})

export const AccountDebt = createEntity('AccountDebt', {
	account : String, 
	debtAmountTotal : Number, 
	token : String,
	timestamp: {
		type: Number,
		index: true,
	}
})




	 

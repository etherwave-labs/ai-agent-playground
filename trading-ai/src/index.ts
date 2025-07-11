import { logger, type IAgentRuntime, type Project, type ProjectAgent } from '@elizaos/core';    
//import rag from './actions/rag.ts';
//import getRagPlugin from './providers/getRagPlugin.ts';
import fetchBTCPricePlugin from './providers/fetchBTCPrice.ts';
import fetchNewsCoinDeskPlugin from './providers/fetchNewsCoinDesk.ts';
import getBalanceHyperLiquidPlugin from './providers/getBalanceHyperLiquid.ts';
import getOpenOrdersHyperLiquidPlugin from './providers/getOpenOrdersHyperLiquid.ts';
import getPnLHyperLiquidPlugin from './providers/getPnL.ts';
import placeOrderPlugin from './actions/placeOrder.ts';
import getDataMarketPlugin from './providers/getDataMarket.ts';
import { character } from './character.ts';
import log from './actions/log.ts';
export const projectAgent: ProjectAgent = {
  character,
  plugins: [log, fetchBTCPricePlugin, fetchNewsCoinDeskPlugin, getBalanceHyperLiquidPlugin, getOpenOrdersHyperLiquidPlugin, getPnLHyperLiquidPlugin, placeOrderPlugin, getDataMarketPlugin],
};
const project: Project = {
  agents: [projectAgent],
};

// Export test suites for the test runner
//export { testSuites } from './__tests__/e2e';
export { character } from './character.ts';

export default project;
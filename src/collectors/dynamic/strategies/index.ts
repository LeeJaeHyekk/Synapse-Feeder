/**
 * Fetch Strategies
 */

import { AxiosStrategy } from './AxiosStrategy.js'
import { PlaywrightStrategy } from './PlaywrightStrategy.js'

export { type FetchStrategy } from './FetchStrategy.js'
export { AxiosStrategy } from './AxiosStrategy.js'
export { PlaywrightStrategy } from './PlaywrightStrategy.js'
export { ApiStrategy } from './ApiStrategy.js'

/**
 * 전략 팩토리
 */
export function createStrategy(fetcher: 'AXIOS' | 'PLAYWRIGHT'): FetchStrategy {
  if (fetcher === 'PLAYWRIGHT') {
    return new PlaywrightStrategy()
  }
  return new AxiosStrategy()
}

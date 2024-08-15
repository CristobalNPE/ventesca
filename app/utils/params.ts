export const FILTER_PARAMS = {
	STATUS: 'status',
	TIME_PERIOD: 'timePeriod',
	SELLER: 'seller',
	SORT_BY: 'sort-by',
	SORT_DIRECTION: 'sort-direction',
	STOCK: 'stock',
	CATEGORY: 'category',
	SUPPLIER: 'supplier',
}

type ParamConfig = {
  name: string;
  type: 'number' | 'string' | 'boolean';
  default?: any;
};

export function parseUrlParams(url: string, paramConfigs: Record<string, ParamConfig>) {
  const urlObj = new URL(url);
  const result: Record<string, any> = {};

  for (const [key, config] of Object.entries(paramConfigs)) {
    const value = urlObj.searchParams.get(config.name);
    
    if (value !== null) {
      switch (config.type) {
        case 'number':
          result[key] = Number(value);
          break;
        case 'boolean':
          result[key] = value.toLowerCase() === 'true';
          break;
        default:
          result[key] = value;
      }
    } else if ('default' in config) {
      result[key] = config.default;
    }
  }

  return result;
}

// // Usage example for the inventory loader
// const inventoryParams = {
//   $top: { name: '$top', type: 'number', default: 25 },
//   $skip: { name: '$skip', type: 'number', default: 0 },
//   searchTerm: { name: 'search', type: 'string' },
//   sortBy: { name: FILTER_PARAMS.SORT_BY, type: 'string' },
//   sortDirection: { name: FILTER_PARAMS.SORT_DIRECTION, type: 'string' },
//   stockFilter: { name: FILTER_PARAMS.STOCK, type: 'string' },
//   categoryFilter: { name: FILTER_PARAMS.CATEGORY, type: 'string' },
//   statusFilter: { name: FILTER_PARAMS.STATUS, type: 'string' },
// };

// // In the loader
// const params = parseUrlParams(request.url, inventoryParams);
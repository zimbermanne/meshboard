// Currency conversion utilities
// 1 baosh = 500 TSH (Tanzanian Shillings)

const TSH_PER_BAOSH = 500;

/**
 * Convert TSH to baosh
 * @param {number} tshAmount - Amount in Tanzanian Shillings
 * @returns {number} Amount in baosh
 */
function tshToBaosh(tshAmount) {
  return parseFloat((tshAmount / TSH_PER_BAOSH).toFixed(2));
}

/**
 * Convert baosh to TSH
 * @param {number} baoshAmount - Amount in baosh
 * @returns {number} Amount in Tanzanian Shillings
 */
function baoshToTsh(baoshAmount) {
  return parseFloat((baoshAmount * TSH_PER_BAOSH).toFixed(2));
}

/**
 * Format baosh amount for display
 * @param {number} baoshAmount - Amount in baosh
 * @returns {string} Formatted string with currency symbol
 */
function formatBaosh(baoshAmount) {
  return `${baoshAmount.toFixed(2)} BSH`;
}

/**
 * Format TSH amount for display
 * @param {number} tshAmount - Amount in Tanzanian Shillings
 * @returns {string} Formatted string with currency symbol
 */
function formatTsh(tshAmount) {
  return `${tshAmount.toFixed(2)} TSH`;
}

module.exports = {
  TSH_PER_BAOSH,
  tshToBaosh,
  baoshToTsh,
  formatBaosh,
  formatTsh
};

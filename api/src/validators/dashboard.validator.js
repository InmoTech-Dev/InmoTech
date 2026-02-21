const Joi = require('joi');

const dashboardOverviewQuerySchema = Joi.object({
  range: Joi.string()
    .valid('7d', '30d', '90d')
    .optional()
    .default('30d')
});

module.exports = {
  dashboardOverviewQuerySchema
};

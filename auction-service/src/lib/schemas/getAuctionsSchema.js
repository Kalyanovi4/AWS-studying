const schema = {
  type: 'object',
  properties: {
    queryStringParameters: {
      type: 'object',
      required: ['status'],
      default: { status: 'OPEN' },
      properties: {
        status: {
          type: 'string',
          enum: ['OPEN', 'CLOSED'],
          default: 'OPEN',
        },
      },
    },
  },
  required: ['queryStringParameters'],
};

export default schema;

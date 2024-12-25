import AWS from 'aws-sdk';
import middy from '@middy/core';
import validatorMiddleware from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import httpErrorHandler from '@middy/http-error-handler';
import createError from 'http-errors';
import getAuctionsSchema from '../lib/schemas/getAuctionsSchema.js';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function getAuctions(event, context) {
  const { status } = event.queryStringParameters;
  let auctions;

  const params = {
    TableName: process.env.AUCTIONS_TABLE_NAME,
    IndexName: 'statusAndEndDate',
    KeyConditionExpression: '#status = :status',
    ExpressionAttributeValues: {
      ':status': status,
    },
    ExpressionAttributeNames: {
      '#status': 'status',
    },
  };

  try {
    const result = await dynamodb.query(params).promise();

    auctions = result.Items;
    return {
      statusCode: 200,
      body: JSON.stringify(auctions),
    };
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }
}

export const handler = middy(getAuctions)
  .use(httpErrorHandler())
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema(getAuctionsSchema),
      useDefaults: true,
      ajvOptions: {
        useDefaults: true,
        strict: false,
      },
    })
  );

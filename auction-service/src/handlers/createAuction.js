import { v4 as uuid } from 'uuid';
import AWS from 'aws-sdk';
import middy from '@middy/core';
import httpJsonBodyParser from '@middy/http-json-body-parser';
import validatorMiddleware from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import httpErrorHandler from '@middy/http-error-handler';
import createError from 'http-errors';
import createAuctionSchema from '../lib/schemas/createAuctionSchema.js';

const dynamodb = new AWS.DynamoDB.DocumentClient();

async function createAuction(event, context) {
  const { title } = event.body;
  // Getting email by decoding id_token on jwt.io website
  // Can be done via Postman, lecture 50 comments helped
  const { email } = event.requestContext.authorizer;
  const now = new Date();
  const endDate = new Date();
  endDate.setHours(now.getHours() + 1);

  const auction = {
    id: uuid(),
    title,
    status: 'OPEN',
    createdAt: now.toISOString(),
    endingAt: endDate.toISOString(),
    highestBid: {
      amount: 0,
    },
    seller: email,
  };

  try {
    await dynamodb
      .put({
        TableName: process.env.AUCTIONS_TABLE_NAME,
        Item: auction,
      })
      .promise();
    return {
      statusCode: 201,
      body: JSON.stringify(auction),
    };
  } catch (error) {
    console.error(error);
    throw new createError.InternalServerError(error);
  }
}

export const handler = middy(createAuction)
  .use(httpJsonBodyParser())
  .use(httpErrorHandler())
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema(createAuctionSchema),
      ajvOptions: {
        strict: false,
      },
    })
  );

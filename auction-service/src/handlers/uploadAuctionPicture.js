import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import validatorMiddleware from '@middy/validator';
import { transpileSchema } from '@middy/validator/transpile';
import createError from 'http-errors';
import uploadAuctionPictureSchema from '../lib/schemas/uploadAuctionPictureSchema.js';
import { getAuctionById } from './getAuction.js';
import { uploadPictureToS3 } from '../lib/uploadPictureToS3.js';
import { setAuctionPictureUrl } from '../lib/setAuctionPictureUrl.js';

export async function uploadAuctionPicture(event) {
  const { id } = event.pathParameters;
  const { email } = event.requestContext.authorizer;
  const auction = await getAuctionById(id);

  // Upload auction picture identity validation
  if (auction.seller !== email) {
    throw new createError.Forbidden(
      `You cannot upload picture for other people auction!`
    );
  }

  const base64 = event.body.replace(/^data:image\/w+;base64,/, '');
  const buffer = Buffer.from(base64, 'base64');

  let updatedAuction;

  try {
    const pictureUrl = await uploadPictureToS3(auction.id + '.jpg', buffer);
    updatedAuction = await setAuctionPictureUrl(auction.id, pictureUrl);
    return {
      statusCode: 200,
      body: JSON.stringify(updatedAuction),
    };
  } catch (error) {
    console.log(error);
    throw new createError.InternalServerError(error);
  }
}

export const handler = middy(uploadAuctionPicture)
  .use(httpErrorHandler())
  .use(
    validatorMiddleware({
      eventSchema: transpileSchema(uploadAuctionPictureSchema),
      useDefaults: true,
      ajvOptions: {
        useDefaults: true,
        strict: false,
      },
    })
  );

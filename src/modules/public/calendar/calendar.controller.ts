import {Request, Response} from 'express';
import { getCalendarMonthQuerySchema } from '../../../validation/calendar.validation.js';
import * as calendarService from './calendar.service.js';
import { HttpStatus } from '../../../errors/http-status.js';


export const getMonthAvailabilityController = async (req: Request, res: Response) => {

        const query = getCalendarMonthQuerySchema.parse(req.query);

        const calendars = await calendarService.getMonthAvailability(query.month, query.propertyId)

        res.status(HttpStatus.OK).json({
            calendars,
            message: "Calendar retrieve successfully "
        })
    }
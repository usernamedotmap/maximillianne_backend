
import { Errors } from '../../../errors/appError.js';
import * as propertyRepository from './property.repository.js'



export const getPropertyService = async () => {

    const property = await propertyRepository.findById(1);

    if (!property) {
        throw  Errors.notFound("Property");
    }

    return property;

} 

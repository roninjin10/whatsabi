import { expect } from '@jest/globals';

import { selectorsToInterfaces } from '../interfaces';

import { test } from "./env";


test('selectors to interfaces', async ({}) => {
    // Given a set of interfaces, get the interfaces that it implements
    const selectors = ['0x02751cec', '0x054d50d4', '0x18cbafe5', '0x1f00ca74', '0x2195995c', '0x38ed1739', '0x4a25d94a', '0x5b0d5984', '0x5c11d795', '0x791ac947', '0x7ff36ab5', '0x85f8c259', '0x8803dbee', '0xad5c4648', '0xad615dec', '0xaf2979eb', '0xb6f9de95', '0xbaa2abde', '0xc45a0155', '0xd06ca61f', '0xded9382a', '0xe8e33700', '0xf305d719', '0xfb3bdb41'];

    const got = selectorsToInterfaces(selectors);

});


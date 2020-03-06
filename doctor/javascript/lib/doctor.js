/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;

class Doctor extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const records = [
            {
                date: '2020/01/01 12:00:00',
                doctor: 'Doctor_1',
                patient: 'Patient_1',
                information: 'fracture',
            },
            {
                date: '2020/01/01 12:00:00',
                doctor: 'Doctor_2',
                patient: 'Patient_2',
                information: 'fracture',
            },
            {
                date: '2020/01/01 12:00:00',
                doctor: 'Doctor_1',
                patient: 'Patient_3',
                information: 'fracture',
            },
        ];

        for (let i = 0; i < records.length; i++) {
            records[i].docType = 'record';
            await ctx.stub.putState('Record' + i, Buffer.from(JSON.stringify(records[i])));
            console.info('Added <--> ', records[i]);
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    async queryCar(ctx, carNumber) {
        const carAsBytes = await ctx.stub.getState(carNumber); // get the car from chaincode state
        if (!carAsBytes || carAsBytes.length === 0) {
            throw new Error(`${carNumber} does not exist`);
        }
        console.log(carAsBytes.toString());
        return carAsBytes.toString();
    }

    async createRecord(ctx, carNumber, make, model, color, owner) {
        console.info('============= START : Create Car ===========');
        const attr = ctx.stub.getAttributeValue();
        console.log(attr);
        // if (!ctx.stub.assertAttributeValue('hf.role', 'doctor')) {
        //     console.error('Only doctor can create record');
        //     return false;
        // }
        // proceed to carry out auditing

        const car = {
            color,
            docType: 'car',
            make,
            model,
            owner,
        };

        await ctx.stub.putState(carNumber, Buffer.from(JSON.stringify(car)));
        console.info('============= END : Create Car ===========');
    }

    async getUserId(ctx) {
        let cid = new ClientIdentity(ctx.stub);
        const id = cid.getID();

        return id.toString();
    }
    async getUserAttr(ctx) {
        let cid = new ClientIdentity(ctx.stub);
        const attr = cid.getAttributeValue();

        return attr.toString();
    }
    
    async queryAllCars(ctx) {
        console.log('===== START : queryAllCars =====')
        let cid = new ClientIdentity(ctx.stub);
        const id = cid.getID();
        console.log(id)
        const attr = cid.getAttributeValue();
        console.log(attr);

        const startKey = 'Record0';
        const endKey = 'Record999';

        const iterator = await ctx.stub.getStateByRange(startKey, endKey);

        const allResults = [];
        while (true) {
            const res = await iterator.next();

            if (res.value && res.value.value.toString()) {
                console.log(res.value.value.toString('utf8'));

                const Key = res.value.key;
                let Record;
                try {
                    Record = JSON.parse(res.value.value.toString('utf8'));
                } catch (err) {
                    console.log(err);
                    Record = res.value.value.toString('utf8');
                }
                allResults.push({ Key, Record });
            }
            if (res.done) {
                console.log('end of data');
                await iterator.close();
                console.info(allResults);
                return JSON.stringify(allResults);
            }
        }
    }

    async changeCarOwner(ctx, carNumber, newOwner) {
        console.info('============= START : changeCarOwner ===========');

        const carAsBytes = await ctx.stub.getState(carNumber); // get the car from chaincode state
        if (!carAsBytes || carAsBytes.length === 0) {
            throw new Error(`${carNumber} does not exist`);
        }
        const car = JSON.parse(carAsBytes.toString());
        car.owner = newOwner;

        await ctx.stub.putState(carNumber, Buffer.from(JSON.stringify(car)));
        console.info('============= END : changeCarOwner ===========');
    }

}

module.exports = Doctor;

/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');
const ClientIdentity = require('fabric-shim').ClientIdentity;
require('date-utils');

class Record extends Contract {

    async initLedger(ctx) {
        console.info('============= START : Initialize Ledger ===========');
        const records = [
            {
                user_id: 'user_test1',
                value: {
                    access_list: [
                        {
                            role: 'doctor',
                            id: 'doctor_test1'
                        },
                    ],
                    allowed_list: [
                        {
                            role: 'patient',
                            id: 'user_test2'
                        },
                    ],
                    medical_info: [
                        {
                            date: '2020/01/01 12:00:00',
                            writer_id: 'doctor_test1',
                            information: 'fracture',
                        }
                    ]
                }
            },
            {
                user_id: 'user_test2',
                value: {
                    access_list: [
                        {
                            role: 'doctor',
                            id: 'doctor_test2'
                        },
                        {
                            role: 'patient',
                            id: 'user_test1'
                        }
                    ],
                    medical_info: [
                        {
                            date: '2020/01/01 12:00:00',
                            writer_id: 'doctor_test2',
                            information: 'cold',
                        },
                    ]
                }
            },
            {
                user_id: 'doctor_test1',
                value: {
                    allowed_list: [
                        {
                            role: 'patient',
                            id: 'user_test1'
                        },
                    ],
                }
            },
            {
                user_id: 'doctor_test2',
                value: {
                    allowed_list: [
                        {
                            role: 'patient',
                            id: 'user_test2'
                        },
                    ],
                }
            },
            {
                user_id: 'doctor_test3',
                value: {
                    access_list: [],
                    allowed_list: [],
                }
            },
        ];

        for (let i = 0; i < records.length; i++) {
            // records[i].value.docType = 'record';
            await ctx.stub.putState(records[i].user_id, Buffer.from(JSON.stringify(records[i].value)));
            console.info('Added <--> ', records[i]);
        }
        console.info('============= END : Initialize Ledger ===========');
    }

    async createPatientRecord(ctx){
        const record = {
            access_list: [],
            allowed_list: [],
            medical_info: [],
        }

        const id = this.getCallerId(ctx);

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(record)));

        return true;
    }

    // async createDoctorRecord(){}

    async writePatientRecord(ctx, patientId, info){
        const caller = this.getCallerId(ctx);

        // Doctor only
        let cid = new ClientIdentity(ctx.stub);
        if (!cid.assertAttributeValue("role", "doctor")) {
            throw new Error('Only doctor can write recored');
        }

        // Get record
        const recordAsByte = await ctx.stub.getState(patientId);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${patientId} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        // Check permission
        const permission = record.access_list.filter(access => {
            return access.id == caller;
        });
        if (!permission || permission.length === 0) {
            throw new Error(`${caller} is not allowed to modify the record`);
        }
        
        // Write record
        var now = new Date();
        const medical_info = {
            date: now.toFormat("YYYY/MM/DD PP HH:MI"),
            writer_id: caller,
            information: info,
        }
        record.medical_info.push(medical_info);

        await ctx.stub.putState(patientId, Buffer.from(JSON.stringify(record)));

        return true;
    }

    async getMyMedicalInfo(ctx){
        const caller = this.getCallerId(ctx);

        // Get record
        const recordAsByte = await ctx.stub.getState(caller);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${caller} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        return JSON.stringify(record.medical_info);
    }

    async getMedicalInfoByPatientId(ctx, patientId){
        const caller = this.getCallerId(ctx);

        // Get record
        const recordAsByte = await ctx.stub.getState(patientId);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${patientId} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        // Check permission
        const permission = record.access_list.filter(access => {
            return access.id == caller;
        });
        if (!permission || permission.length === 0) {
            throw new Error(`${caller} is not allowed to modify the record`);
        }

        return JSON.stringify(record.medical_info);
    }

    async getDoctorList(ctx){//  *all doctor role users*
        const caller = this.getCallerId(ctx);

        // Patient only
        let cid = new ClientIdentity(ctx.stub);
        if (!cid.assertAttributeValue("role", "patient")) {
            throw new Error('Only patient can get the doctor list');
        }

        // Get record
        const recordAsByte = await ctx.stub.getState(caller);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${caller} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        // Filter doctors
        const doctors = record.access_list.filter(access => {
            return access.role == 'doctor';
        });

        return JSON.stringify(doctors);
    }

    async getAccessList(ctx){// *all permission users*
        const caller = this.getCallerId(ctx);

        // Patient only
        let cid = new ClientIdentity(ctx.stub);
        if (!cid.assertAttributeValue("role", "patient")) {
            throw new Error('Only patient can get the access list');
        }

        // Get record
        const recordAsByte = await ctx.stub.getState(caller);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${caller} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        return JSON.stringify(record.access_list);
    }

    async getAllowedList(ctx){// *all permission users*
        const caller = this.getCallerId(ctx);

        // Get record
        const recordAsByte = await ctx.stub.getState(caller);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${caller} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        return JSON.stringify(record.allowed_list);
    }

    async checkMyPermissionStatus(ctx, patientId){ // *check if I’m allowed by patientID*
        const caller = this.getCallerId(ctx);

        // Get record
        const recordAsByte = await ctx.stub.getState(patientId);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${patientId} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        // Check permission
        const permission = record.access_list.filter(access => {
            return access.id == caller;
        });
        if (!permission || permission.length === 0) {
            return false
        }

        return true;
    }

    async addPermission(ctx, id, role){
        const caller = this.getCallerId(ctx);
        const callerRole = this.getCallerRole(ctx);

        // Get record
        const recordAsByte = await ctx.stub.getState(caller);
        if (!recordAsByte || recordAsByte.length === 0) {
            throw new Error(`${caller} does not exist`);
        }
        const record = JSON.parse(recordAsByte.toString());

        const recordAllowedAsByte = await ctx.stub.getState(id);
        if (!recordAllowedAsByte || recordAllowedAsByte.length === 0) {
            throw new Error(`${id} does not exist`);
        }
        const recordAllowed = JSON.parse(recordAllowedAsByte.toString());

        // Add permission
        const permission = record.access_list.filter(access => {
            return access.id == id;
        });
        if (!permission || permission.length === 0) {
            record.access_list.push({
                id: id,
                role: role,
            });
        }
        const allowed = recordAllowed.allowed_list.filter(allowed => {
            return allowed.id == caller;
        });
        if (!allowed || allowed.length === 0) {
            recordAllowed.allowed_list.push({
                id: caller,
                role: callerRole,
            });
        }

        await ctx.stub.putState(caller, Buffer.from(JSON.stringify(record)));
        await ctx.stub.putState(id, Buffer.from(JSON.stringify(recordAllowed)));

        return true;
    }

    // async deletePermission(ctx, id){
    //     const caller = 'user_test1';
    //     // Get record
    //     const recordAsByte = await ctx.stub.getState(caller);
    //     if (!recordAsByte || recordAsByte.length === 0) {
    //         throw new Error(`${caller} does not exist`);
    //     }
    //     const record = JSON.parse(recordAsByte.toString());

    //     // Delete permission
    //     const permission = record.access_list.filter(access => {
    //         return access.id != id;
    //     });
    //     record.access_list = permission;

    //     await ctx.stub.putState(caller, Buffer.from(JSON.stringify(record)));
    //     return true;
    // }








    getCallerId(ctx) {
        let cid = new ClientIdentity(ctx.stub);
        const idString = cid.getID();// "x509::{subject DN}::{issuer DN}"
        const idParams = idString.toString().split('::');
        return idParams[1].split('CN=')[1];

    }

    getCallerRole(ctx) {
        let cid = new ClientIdentity(ctx.stub);
        return cid.getAttributeValue("role");

    }
}

module.exports = Record;

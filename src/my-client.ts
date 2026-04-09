import { ConnectorError } from "@sailpoint/connector-sdk"
import Airtable from "airtable"

export class MyClient {
    private readonly airtableBase: Airtable.Base

    constructor(config: any) {
        if (config?.apikey == null) {
            throw new ConnectorError('apikey must be provided from config')
        }
        if (config?.airtableBase == null) {
            throw new ConnectorError('airtableBase must be provided from config')
        }
        
        this.airtableBase = new Airtable({ apiKey: config.apikey }).base(config.airtableBase);
    }

    // Converte IDs do SailPoint (ex: airtable_admin) para Record IDs internos do Airtable (ex: recXYZ...)
    private async getGroupRecordIds(groupStringIds: string[]): Promise<string[]> {
        if (!groupStringIds || groupStringIds.length === 0) return [];

        const records = await this.airtableBase('Groups').select().all();
        const recordIds: string[] = [];

        for (const stringId of groupStringIds) {
            const groupRecord = records.find(r => r.get('id') === stringId);
            if (groupRecord) {
                recordIds.push(groupRecord.getId());
            }
        }
        return recordIds;
    }

    // Busca dinâmica dos Grupos/Entitlements
    async getGroups(): Promise<any[]> {
        const records = await this.airtableBase('Groups').select().all();
        
        return records.map(record => {
            return {
                id: record.get('id'),     
                name: record.get('name')  
            };
        });
    }

    // Leitura Geral
    async getAllAccounts(): Promise<any[]> {
        const records = await this.airtableBase('Users').select().all()
        
        return records.map(record => {
            return {
                id: record.get('id'),
                name: record.get('name'),
                email: record.get('email'),
                groups: record.get('id (from groups)') || [],
                IIQDisabled: record.get('Inactive') === true
            };
        })
    }

    // Leitura Individual 
    async getAccount(identity: string): Promise<any> {
        const records = await this.airtableBase('Users').select({
            filterByFormula: `{id} = '${identity}'`
        }).firstPage();

        if (records.length === 0) {
            throw new ConnectorError(`Account with id ${identity} not found`);
        }

        const record = records[0];
        return {
            id: record.get('id'),
            name: record.get('name'),
            email: record.get('email'),
            groups: record.get('id (from groups)') || [],
            IIQDisabled: record.get('Inactive') === true
        };
    }

    // Criação: Suporta criação de conta já com os grupos atribuídos
    async createAccount(attributes: any): Promise<any> {
        // 1. Traduz os grupos enviados pelo SailPoint para Record IDs do Airtable
        let groupRecordIds: string[] = [];
        if (attributes.groups) {
            const groupsArray = Array.isArray(attributes.groups) ? attributes.groups : [attributes.groups];
            groupRecordIds = await this.getGroupRecordIds(groupsArray);
        }

        // 2. Envia a requisição de criação
        const records = await this.airtableBase('Users').create([{
            fields: { 
                "id": Number(attributes.id),
                "name": attributes.name,
                "email": attributes.email,
                "groups": groupRecordIds 
            }
        }]);

        if (records.length === 0) {
            throw new ConnectorError('Falha ao criar a conta no Airtable');
        }

        const record = records[0];
        
        return {
            id: record.get('id'), 
            name: record.get('name'),
            email: record.get('email'),
            groups: record.get('id (from groups)') || [],
            IIQDisabled: record.get('Inactive') === true
        };
    }

    // Processa o plano de acesso (Add/Remove) de forma inteligente
    async updateAccount(identity: string, changes: any[]): Promise<any> {
        const records = await this.airtableBase('Users').select({
            filterByFormula: `{id} = '${identity}'`
        }).firstPage();

        if (records.length === 0) {
            throw new ConnectorError(`Account with id ${identity} not found for update`);
        }

        const record = records[0];
        const recordId = record.getId(); 

        let fieldsToUpdate: any = {};
        
        // Recupera os vínculos (Record IDs) que o usuário já possui
        let currentGroupRecIds: string[] = record.get('groups') as string[] || [];

        // Varre as requisições enviadas pelo SailPoint
        for (const change of changes) {
            if (change.attribute === 'groups') {
                // Traduz o grupo alvo da requisição
                const changeGroupRecIds = await this.getGroupRecordIds([change.value]);
                const targetRecId = changeGroupRecIds.length > 0 ? changeGroupRecIds[0] : null;

                if (targetRecId) {
                    if (change.op === 'Add') {
                        currentGroupRecIds.push(targetRecId);
                        fieldsToUpdate['groups'] = [...new Set(currentGroupRecIds)]; // Remove duplicatas
                    } else if (change.op === 'Remove') {
                        fieldsToUpdate['groups'] = currentGroupRecIds.filter(id => id !== targetRecId);
                    } else if (change.op === 'Set') {
                        fieldsToUpdate['groups'] = changeGroupRecIds;
                    }
                }
            } else {
                // Para atributos simples (name, email)
                if (change.op === 'Set' || change.op === 'Add') { 
                    fieldsToUpdate[change.attribute] = change.value;
                }
            }
        }

        // Se não houver nada para atualizar (ex: grupo não encontrado), aborta e retorna o usuário como está
        if (Object.keys(fieldsToUpdate).length === 0) {
            return this.getAccount(identity);
        }

        // Aplica as atualizações no Airtable
        const updatedRecords = await this.airtableBase('Users').update([
            {
                id: recordId,
                fields: fieldsToUpdate
            }
        ]);

        return { 
            id: updatedRecords[0].get('id'), 
            name: updatedRecords[0].get('name'),
            email: updatedRecords[0].get('email'),
            groups: updatedRecords[0].get('id (from groups)') || []
        };
    }

    // Desabilita a conta marcando o checkbox Inactive
    async disableAccount(identity: string): Promise<any> {
        const records = await this.airtableBase('Users').select({
            filterByFormula: `{id} = '${identity}'`
        }).firstPage();

        if (records.length === 0) {
            throw new ConnectorError(`Account with id ${identity} not found for disable`);
        }

        const recordId = records[0].getId(); 
        const updatedRecords = await this.airtableBase('Users').update([
            { id: recordId, fields: { "Inactive": true } }
        ]);

        return this.getAccount(identity); 
    }

    // Habilita a conta desmarcando o checkbox Inactive
    async enableAccount(identity: string): Promise<any> {
        const records = await this.airtableBase('Users').select({
            filterByFormula: `{id} = '${identity}'`
        }).firstPage();

        if (records.length === 0) {
            throw new ConnectorError(`Account with id ${identity} not found for enable`);
        }

        const recordId = records[0].getId(); 
        const updatedRecords = await this.airtableBase('Users').update([
            { id: recordId, fields: { "Inactive": false } }
        ]);

        return this.getAccount(identity); 
    }

    // Exclusão: Mantida inalterada
    async deleteAccount(identity: string): Promise<any> {
        const records = await this.airtableBase('Users').select({
            filterByFormula: `{id} = '${identity}'`
        }).firstPage();

        if (records.length === 0) {
            throw new ConnectorError(`Account with id ${identity} not found for deletion`);
        }

        const recordId = records[0].getId(); 
        await this.airtableBase('Users').destroy([recordId]);

        return {};
    }

    // Test Connection
    async testConnection(): Promise<any> {
        return this.airtableBase('Users').select().firstPage().then(records => {
            return {}
        }).catch((err: any) => {
            console.error('ERRO DETALHADO DO AIRTABLE:', JSON.stringify(err, null, 2)) 
            throw new ConnectorError('Unable to connect: ' + err.message)
        })
    }
}
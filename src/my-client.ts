import { ConnectorError } from "@sailpoint/connector-sdk"
import Airtable from "airtable"

export class MyClient {
    private readonly airtableBase: Airtable.Base

    // Inicializa a conexão validando as credenciais (evita erro 401/403)
    constructor(config: any) {
        if (config?.apikey == null) {
            throw new ConnectorError('apikey must be provided from config')
        }
        if (config?.airtableBase == null) {
            throw new ConnectorError('airtableBase must be provided from config')
        }
        
        this.airtableBase = new Airtable({ apiKey: config.apikey }).base(config.airtableBase);
    }

    // Leitura em Massa: Retorna id, name e email de todos
    async getAllAccounts(): Promise<any[]> {
        const records = await this.airtableBase('Users').select().all()
        
        return records.map(record => {
            return {
                id: record.get('id'),
                name: record.get('name'),
                email: record.get('email')
            };
        })
    }

    // Leitura Individual: Retorna id, name e email de um único ID
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
            email: record.get('email')
        };
    }

    // Criação: Salva id, name e email e retorna a confirmação completa
    async createAccount(attributes: any): Promise<any> {
        // Enviamos o ID gerado junto com os outros dados
        const records = await this.airtableBase('Users').create([{
            fields: { 
                "id": Number(attributes.id), // <-- INCLUSÃO DO ID AQUI
                "name": attributes.name,
                "email": attributes.email 
            }
        }]);

        if (records.length === 0) {
            throw new ConnectorError('Falha ao criar a conta no Airtable');
        }

        const record = records[0];
        
        // Retornamos o valor da coluna 'id' em vez do record.getId() interno
        return {
            id: record.get('id'), 
            name: record.get('name'),
            email: record.get('email')
        };
    }

    // Atualização: Aplica o plano de mudanças dinamicamente
    async updateAccount(identity: string, changes: any[]): Promise<any> {
        const records = await this.airtableBase('Users').select({
            filterByFormula: `{id} = '${identity}'`
        }).firstPage();

        if (records.length === 0) {
            throw new ConnectorError(`Account with id ${identity} not found for update`);
        }

        const recordId = records[0].getId(); 

        let fieldsToUpdate: any = {};
        for (const change of changes) {
            if (change.op === 'Set' || change.op === 'Add') { 
                fieldsToUpdate[change.attribute] = change.value;
            }
        }

        const updatedRecords = await this.airtableBase('Users').update([
            {
                id: recordId,
                fields: fieldsToUpdate
            }
        ]);

        return { 
            id: updatedRecords[0].get('id'), 
            name: updatedRecords[0].get('name'),
            email: updatedRecords[0].get('email') 
        };
    }

    // Exclusão: Deleta a conta pela identidade
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

    // Validação de porta aberta para a interface gráfica
    async testConnection(): Promise<any> {
        return this.airtableBase('Users').select().firstPage().then(records => {
            return {}
        }).catch((err: any) => {
            console.error('ERRO DETALHADO DO AIRTABLE:', JSON.stringify(err, null, 2)) 
            throw new ConnectorError('Unable to connect: ' + err.message)
        })
    }
}
import {
    Context,
    createConnector,
    readConfig,
    Response,
    logger,
    StdAccountListOutput,
    StdAccountReadInput,
    StdAccountReadOutput,
    StdTestConnectionOutput,
    StdAccountListInput,
    StdTestConnectionInput,
    StdAccountCreateInput,
    StdAccountCreateOutput,
    StdAccountUpdateInput,
    StdAccountUpdateOutput,
    StdAccountDeleteInput,
    StdAccountDeleteOutput,
    StdEntitlementListInput,
    StdEntitlementListOutput
} from '@sailpoint/connector-sdk'
import { MyClient } from './my-client'

export const connector = async () => {

    const config = await readConfig()
    const myClient = new MyClient(config)

    return createConnector()
        .stdTestConnection(async (context: Context, input: StdTestConnectionInput, res: Response<StdTestConnectionOutput>) => {
            logger.info("Running test connection")
            res.send(await myClient.testConnection())
        })
        .stdAccountList(async (context: Context, input: StdAccountListInput, res: Response<StdAccountListOutput>) => {
            const accounts = await myClient.getAllAccounts()

            for (const account of accounts) {
                res.send({ 
                identity: account.id ? account.id.toString() : '', 
                uuid: account.id ? account.id.toString() : '', 
                attributes: { 
                    id: account.id, 
                    name: account.name,
                    email: account.email 
                }
            })
            }
            logger.info(`stdAccountList sent ${accounts.length} accounts`)
        })
        .stdAccountRead(async (context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
            const account = await myClient.getAccount(input.identity)

           res.send({ 
                identity: account.id ? account.id.toString() : '', 
                uuid: account.id ? account.id.toString() : '', 
                attributes: { 
                    id: account.id, 
                    name: account.name,
                    email: account.email 
                }
            })
            logger.info(`stdAccountRead read account : ${input.identity}`)
        })
        .stdAccountCreate(async (context: Context, input: StdAccountCreateInput, res: Response<StdAccountCreateOutput>) => {
            // 1. Busca todas as contas atuais para saber o maior ID
            const accounts = await myClient.getAllAccounts()
            
            // 2. Calcula o próximo ID (pega o maior valor de id e soma 1)
            const maxId = accounts.reduce((max, acc) => Math.max(max, Number(acc.id) || 0), 0)
            const nextId = (maxId + 1).toString()

            logger.info(`Gerando novo ID sequencial: ${nextId}`)

            // 3. Adiciona o novo ID aos atributos antes de enviar para o Airtable
            const attributesWithId = { ...input.attributes, id: nextId }
            const account = await myClient.createAccount(attributesWithId)

            // 4. Retorna para o SailPoint com o ID numérico
            res.send({ 
                identity: nextId, 
                uuid: nextId, 
                attributes: { 
                    id: nextId, 
                    name: account.name,
                    email: account.email 
                }
            })
        })

        .stdAccountUpdate(async (context: Context, input: StdAccountUpdateInput, res: Response<StdAccountUpdateOutput>) => {
            logger.info(`Running account update for ID: ${input.identity}`)
            
            const account = await myClient.updateAccount(input.identity, input.changes)

            res.send({ 
                identity: account.id ? account.id.toString() : '', 
                uuid: account.id ? account.id.toString() : '', 
                attributes: { 
                    id: account.id, 
                    name: account.name,
                    email: account.email 
                }
            })
            logger.info(`stdAccountUpdate updated account : ${account.id}`)
        })
        .stdAccountDelete(async (context: Context, input: StdAccountDeleteInput, res: Response<StdAccountDeleteOutput>) => {
            logger.info(`Running account delete for ID: ${input.identity}`)
            
            await myClient.deleteAccount(input.identity)

            res.send({})
            logger.info(`stdAccountDelete deleted account : ${input.identity}`)
        })
        // NOSSA NOVA ROTA DE PERMISSÕES
        .stdEntitlementList(async (context: Context, input: StdEntitlementListInput, res: Response<StdEntitlementListOutput>) => {
            
            res.send({
                identity: 'airtable_user',
                uuid: 'airtable_user',
                type: 'group', 
                attributes: {
                    id: 'airtable_user',
                    name: 'Airtable - Usuario Padrao'
                }
            })

            res.send({
                identity: 'airtable_admin',
                uuid: 'airtable_admin',
                type: 'group', 
                attributes: {
                    id: 'airtable_admin',
                    name: 'Airtable - Administrador'
                }
            })

            logger.info("stdEntitlementList: Perfis de acesso enviados com sucesso!")
        })
}
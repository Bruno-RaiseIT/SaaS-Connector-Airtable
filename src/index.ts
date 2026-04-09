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
    StdEntitlementListOutput,
    StdAccountEnableInput,
    StdAccountEnableOutput,
    StdAccountDisableInput,
    StdAccountDisableOutput
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
                    email: account.email,
                    groups: account.groups 
                }
            })
            }
            logger.info(`stdAccountList sent ${accounts.length} accounts`)
        })

        // Rota de Leitura de Conta Única
        .stdAccountRead(async (context: Context, input: StdAccountReadInput, res: Response<StdAccountReadOutput>) => {
            const account = await myClient.getAccount(input.identity)

           res.send({ 
                identity: account.id ? account.id.toString() : '', 
                uuid: account.id ? account.id.toString() : '', 
                attributes: { 
                    id: account.id, 
                    name: account.name,
                    email: account.email,
                    groups: account.groups 
                }
            })
            logger.info(`stdAccountRead read account : ${input.identity}`)
        })

        //  Rota de Agregação de Permissões
        .stdEntitlementList(async (context: Context, input: StdEntitlementListInput, res: Response<StdEntitlementListOutput>) => {
            const groups = await myClient.getGroups();

            for (const group of groups) {
                res.send({
                    identity: group.id ? group.id.toString() : '',
                    uuid: group.id ? group.id.toString() : '',
                    type: 'group', 
                    attributes: {
                        id: group.id,
                        name: group.name
                    }
                });
            }

            logger.info(`stdEntitlementList: Foram enviados ${groups.length} perfis de acesso com sucesso!`);
        })
        .stdAccountCreate(async (context: Context, input: StdAccountCreateInput, res: Response<StdAccountCreateOutput>) => {
            // 1. Busca todas as contas 
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

        .stdAccountDisable(async (context: Context, input: StdAccountDisableInput, res: Response<StdAccountDisableOutput>) => {
            logger.info(`Running account disable for ID: ${input.identity}`)
            const account = await myClient.disableAccount(input.identity)
            res.send({ 
                identity: account.id ? account.id.toString() : '', 
                uuid: account.id ? account.id.toString() : '', 
                attributes: account 
            })
            logger.info(`stdAccountDisable disabled account : ${input.identity}`)
        })

        .stdAccountEnable(async (context: Context, input: StdAccountEnableInput, res: Response<StdAccountEnableOutput>) => {
            logger.info(`Running account enable for ID: ${input.identity}`)
            const account = await myClient.enableAccount(input.identity)
            res.send({ 
                identity: account.id ? account.id.toString() : '', 
                uuid: account.id ? account.id.toString() : '', 
                attributes: account 
            })
            logger.info(`stdAccountEnable enabled account : ${input.identity}`)
        })
        
}
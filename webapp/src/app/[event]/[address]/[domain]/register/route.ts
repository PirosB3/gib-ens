import { enforceWhitelist } from "@/services/alchemyService";
import { ENSService } from "@/services/ensService";
import { getPolicySettingOrRedirect } from "@/services/policyService";
import { getEthersProvider } from "@/services/providerService";
import { ENTRYPOINT_ADDRESS, UserOperationService } from "@/services/userOperationService";
import { VoucherService } from "@/services/voucherService";
import { NextRequest, NextResponse } from "next/server";
import { SimpleAccount } from "userop/dist/preset/builder";
import { UserOperationBuilder } from "userop";
import { AbiCoder, ethers, keccak256 } from "ethers";
import { concatHex } from "viem";
import { Network } from "ethers";
import { AlchemyProvider } from "ethers";
import { RedeemService } from "@/services/redeemService";

const EXECUTE_FUNCTION_PREFIX = keccak256(Buffer.from("execute(address,uint256,bytes)")).slice(0, 10) as any;


function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

interface Props {
    params: {
        event: string,
        address: string,
        domain: string
    }
}

export async function POST(request: NextRequest, props: Props): Promise<NextResponse> {
    const config = getPolicySettingOrRedirect(props.params.event);
    // await enforceWhitelist(config, props.params.address);

    const provider = getEthersProvider(config);
    const ens = await ENSService.fromProvider(provider, config);
    const voucher = new VoucherService(ens);
    const availability = await voucher.getDomainAvailability({
        domain: props.params.domain,
        owner: props.params.address,
        policyId: config.policyId,
    });
    if (!availability.isAvailable) {
        return new NextResponse(JSON.stringify(availability), {
            status: 404,
        });
    }
    const redeemService = RedeemService.fromVoucherAndENS(voucher, ens);
    try {
        const redeemJob = await redeemService.startRedeemProcess(availability);
        const url = new URL(`/redeem/${redeemJob.id}`, request.nextUrl);
        return NextResponse.redirect(url);
    } catch (e) {
        // Redirect to active job if present
        const currentRedeem = await redeemService.getCurrentRedeemForUser(props.params.address, config.policyId);
        if (currentRedeem) {
            const url = new URL(`/redeem/${currentRedeem.id}`, request.nextUrl);
            return NextResponse.redirect(url);
        }
        return new NextResponse(JSON.stringify({
            error: "Internal server error",
        }), {
            status: 500,
        });
    }

    // const transactions = await voucher.createTransactions(availability);
    // const callDatas = transactions.map(tx => {
    //     console.log(tx);
    //     const coder = new AbiCoder();
    //     const params = coder.encode(['address', 'uint256', 'bytes'], [tx.to, 0, tx.data]);
    //     const concatenated = concatHex([EXECUTE_FUNCTION_PREFIX, params]);
    //     return concatenated;
    // });

    // const userOpService = new UserOperationService(provider);
    // const sender = await userOpService.getSimpleAccountAddress(props.params.address);
    // const accountNonce = await userOpService.getAccountNonce(props.params.address);
    // const initCode = await userOpService.getInitCode(props.params.address);

    // for (let i = 0; i < transactions.length; i++) {
    //     const userOp = new UserOperationBuilder();
    //     userOp.setSender(sender);
    //     userOp.setInitCode(initCode);
    //     userOp.setNonce(accountNonce.plus(i).toString(16));
    //     userOp.setCallData(callDatas[i]);
    //     const operation = userOp.getOp();
    //     console.log(operation);

    // }

    const options = {
        method: 'POST',
        headers: { accept: 'application/json', 'content-type': 'application/json' },
        body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'alchemy_requestGasAndPaymasterAndData',
            params: [
                {
                    policyId: config.alchemyGasPolicy,
                    entryPoint: ENTRYPOINT_ADDRESS,
                    dummySignature: '0xe8fe34b166b64d118dccf44c7198648127bf8a76a48a042862321af6058026d276ca6abb4ed4b60ea265d1e57e33840d7466de75e13f072bbd3b7e64387eebfe1b',
                    userOperation: {
                        sender,
                        nonce: `0x${accountNonce.toString(16)}`,
                        initCode,
                        callData: callDatas[1],
                    }
                }
            ]
        })
    };
    console.log(options);

    await sleep(85 * 1000);

    const network = Network.from(config.networkId);
    const req = AlchemyProvider.getRequest(network, config.alchemyApiKey);
    
    const response = await fetch(req.url, options);
    const json = await response.json();
    console.log(json);

    return NextResponse.json({
        ok: true,
    })
}

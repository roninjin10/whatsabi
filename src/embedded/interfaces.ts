export const interfaces = {
    "ERC-20": [
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
        "function transfer(address, uint256) returns (bool)",
        "function allowance(address, address) returns (uint256)",
        "function approve(address, uint256) returns (bool)",
        "function transferFrom(address, address, uint256) returns (bool)",
    ],
    "ERC-165": [
        "function supportsInterface(bytes4 interfaceId) view returns (bool)",
    ],
    "ERC-721": [
        "function balanceOf(address owner) view returns (uint256 balance)",
        "function ownerOf(uint256 tokenId) view returns (address owner)",
        "function safeTransferFrom(address from, address to, uint256 tokenId, bytes calldata data)",
        "function safeTransferFrom(address from, address to, uint256 tokenId)",
        "function transferFrom(address from, address to, uint256 tokenId)",
        "function approve(address to, uint256 tokenId)",
        "function setApprovalForAll(address operator, bool _approved)",
        "function getApproved(uint256 tokenId) view returns (address operator)",
        "function isApprovedForAll(address owner, address operator) view returns (bool)",
    ],
    "ERC-777": [
        "function name() view returns (string memory)",
        "function symbol() view returns (string memory)",
        "function granularity() view returns (uint256)",
        "function totalSupply() view returns (uint256)",
        "function balanceOf(address owner) view returns (uint256)",
        "function send(address recipient, uint256 amount, bytes calldata data)",
        "function burn(uint256 amount, bytes calldata data)",
        "function isOperatorFor(address operator, address tokenHolder) view returns (bool)",
        "function authorizeOperator(address operator)",
        "function revokeOperator(address operator)",
        "function defaultOperators() view returns (address[] memory)",
        "function operatorSend(address sender, address recipient, uint256 amount, bytes calldata data, bytes calldata operatorData)",
        "function operatorBurn(address account, uint256 amount, bytes calldata data, bytes calldata operatorData)",
    ],
    "ERC-1155": [
        "function balanceOf(address account, uint256 id) view returns (uint256)",
        "function balanceOfBatch(address[] calldata accounts, uint256[] calldata ids) view returns (uint256[] memory)",
        "function setApprovalForAll(address operator, bool approved)",
        "function isApprovedForAll(address account, address operator) view returns (bool)",
        "function safeTransferFrom( address from, address to, uint256 id, uint256 amount, bytes calldata data)",
        "function safeBatchTransferFrom( address from, address to, uint256[] calldata ids, uint256[] calldata amounts, bytes calldata data)",
    ],
    "ERC-4626": [
    ],
    "Ownable": [
        "function owner() view returns (address)",
        "function renounceOwnership()",
        "function transferOwnership(address)",
    ],
    "Multicall": [
        "function multicall(bytes[]) returns (bytes[] memory)",
    ],
}


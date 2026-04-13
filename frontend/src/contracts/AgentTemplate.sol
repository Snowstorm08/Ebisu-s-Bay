// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract AgentTemplate {
    struct Index {
        uint256 version;
        uint256 count;
        string name;
        mapping(string => string) uriToId;
        mapping(string => string) idToUri;
    }

    Index private index;
    bool private indexExists;

    // Custom Errors (cheaper than require strings)
    error IndexAlreadyExists();
    error IndexDoesNotExist();
    error EmptyInput();
    error DocumentAlreadyExists();

    // Events for off-chain tracking
    event IndexCreated(string name, uint256 version);
    event DocumentAdded(string uri, string cid);

    // Create a new index
    function createIndex(string calldata indexName) external {
        if (indexExists) revert IndexAlreadyExists();
        if (bytes(indexName).length == 0) revert EmptyInput();

        index.name = indexName;
        index.version = 1;
        indexExists = true;

        emit IndexCreated(indexName, 1);
    }

    // Add document to index
    function addDocument(string calldata uri, string calldata documentCID) external {
        if (!indexExists) revert IndexDoesNotExist();
        if (bytes(uri).length == 0 || bytes(documentCID).length == 0) {
            revert EmptyInput();
        }

        // Prevent overwrite (optional safety)
        if (bytes(index.uriToId[uri]).length != 0) {
            revert DocumentAlreadyExists();
        }

        unchecked {
            index.count++;
        }

        index.uriToId[uri] = documentCID;
        index.idToUri[documentCID] = uri;

        emit DocumentAdded(uri, documentCID);
    }

    // Get URI from CID
    function getURIByDocumentCID(string calldata cid)
        external
        view
        returns (string memory)
    {
        if (!indexExists) revert IndexDoesNotExist();
        return index.idToUri[cid];
    }

    // Get CID from URI
    function getDocumentCIDByURI(string calldata uri)
        external
        view
        returns (string memory)
    {
        if (!indexExists) revert IndexDoesNotExist();
        return index.uriToId[uri];
    }

    // Get index metadata
    function getIndexInfo()
        external
        view
        returns (
            string memory name,
            uint256 version,
            uint256 count
        )
    {
        if (!indexExists) revert IndexDoesNotExist();
        return (index.name, index.version, index.count);
    }
}

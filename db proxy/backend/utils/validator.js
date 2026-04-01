// SQL Injection patterns and dangerous keywords
const DANGEROUS_PATTERNS = [
    /DROP\s+TABLE/i,
    /DROP\s+DATABASE/i,
    /TRUNCATE\s+TABLE/i,
    /DELETE\s+FROM/i,
    /UPDATE\s+\w+\s+SET/i,
    /INSERT\s+INTO/i,
    /ALTER\s+TABLE/i,
    /CREATE\s+TABLE/i,
    /CREATE\s+DATABASE/i,
    /--/,
    /;/,
    /UNION\s+SELECT/i,
    /OR\s+1\s*=\s*1/i,
    /'\s*OR\s*'1'\s*=\s*'1/i,
    /"\s*OR\s*"1"\s*=\s*"1/i,
    /EXEC\s+sp_/i,
    /EXECUTE\s+sp_/i,
    /xp_cmdshell/i,
    /SHOW\s+TABLES/i,
    /SHOW\s+DATABASES/i,
    /INFORMATION_SCHEMA/i
];

// Safe SQL keywords (SELECT only)
const SAFE_KEYWORDS = ['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN'];

// Validate query for safety
function validateQuery(query) {
    if (!query || typeof query !== 'string') {
        return {
            isSafe: false,
            message: 'Invalid query format'
        };
    }
    
    const upperQuery = query.toUpperCase().trim();
    
    // Check if query starts with safe keyword
    const startsWithSafe = SAFE_KEYWORDS.some(keyword => 
        upperQuery.startsWith(keyword)
    );
    
    if (!startsWithSafe) {
        return {
            isSafe: false,
            message: 'Only SELECT queries are allowed for safety reasons'
        };
    }
    
    // Check for dangerous patterns
    for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(query)) {
            return {
                isSafe: false,
                message: `Query blocked: Contains dangerous pattern ${pattern.source}`
            };
        }
    }
    
    // Check for multiple queries
    if ((query.match(/;/g) || []).length > 1) {
        return {
            isSafe: false,
            message: 'Multiple queries are not allowed'
        };
    }
    
    return {
        isSafe: true,
        message: 'Query is safe to execute'
    };
}

// Sanitize query by removing dangerous parts
function sanitizeQuery(query) {
    let sanitized = query;
    
    // Remove comments
    sanitized = sanitized.replace(/--.*$/gm, '');
    sanitized = sanitized.replace(/\/\*.*\*\//g, '');
    
    // Remove extra semicolons
    sanitized = sanitized.replace(/;+$/, '');
    
    // Limit result sets
    if (!sanitized.toUpperCase().includes('LIMIT')) {
        sanitized += ' LIMIT 100';
    }
    
    return sanitized;
}

// Check if query is read-only
function isReadOnlyQuery(query) {
    const upperQuery = query.toUpperCase().trim();
    return SAFE_KEYWORDS.some(keyword => upperQuery.startsWith(keyword));
}

module.exports = {
    validateQuery,
    sanitizeQuery,
    isReadOnlyQuery,
    DANGEROUS_PATTERNS,
    SAFE_KEYWORDS
};